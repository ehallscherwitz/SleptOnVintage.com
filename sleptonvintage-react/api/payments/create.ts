import { VercelRequest, VercelResponse } from '@vercel/node';
import { SquareClient, SquareEnvironment } from 'square';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function getSquareEnvironment() {
  const env = (process.env.SQUARE_ENV || '').toLowerCase();
  if (env === 'sandbox') return SquareEnvironment.Sandbox;
  if (env === 'production') return SquareEnvironment.Production;
  return process.env.NODE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox;
}

function getSquareClient() {
  // Construct client at request-time so missing/invalid env vars don't crash the function at import time.
  return new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN!,
    environment: getSquareEnvironment(),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Missing SQUARE_ACCESS_TOKEN env var on server.' });
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL / SUPABASE_ANON_KEY env vars on server.' });
    }

    const { sourceId, orderId, buyerEmail, shippingAddress, billingAddress } = req.body;

    // Validate required fields
    if (!sourceId || !orderId) {
      return res.status(400).json({ 
        error: 'Missing required fields: sourceId, orderId' 
      });
    }

    const client = getSquareClient();

    // Get the order details first to get the total amount
    const ordersApi = client.orders;
    const orderResult = await ordersApi.get({ orderId });

    if (!orderResult.order || !orderResult.order.totalMoney) {
      return res.status(400).json({
        error: 'Order not found or invalid'
      });
    }

    const totalAmount = orderResult.order.totalMoney.amount;

    // Create payment
    const paymentsApi = client.payments;
    const paymentRequest = {
      sourceId: sourceId,
      amountMoney: {
        amount: totalAmount,
        currency: 'USD' as const
      },
      // Square requires idempotency keys <= 45 chars.
      idempotencyKey: crypto.randomUUID(),
      orderId: orderId,
      buyerEmailAddress: buyerEmail,
      shippingAddress: shippingAddress ? {
        addressLine1: shippingAddress.address1,
        addressLine2: shippingAddress.address2 || undefined,
        locality: shippingAddress.city,
        administrativeDistrictLevel1: shippingAddress.state,
        postalCode: shippingAddress.zipCode,
        country: 'US' as const
      } : undefined,
      billingAddress: billingAddress ? {
        addressLine1: billingAddress.address1,
        addressLine2: billingAddress.address2 || undefined,
        locality: billingAddress.city,
        administrativeDistrictLevel1: billingAddress.state,
        postalCode: billingAddress.zipCode,
        country: 'US' as const
      } : undefined,
      note: `Slept On Vintage order - ${orderId}`
    };

    const result = await paymentsApi.create(paymentRequest);

    if (result?.payment) {
      const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined;
      const jwt =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice('Bearer '.length)
          : null;

      if (!jwt) {
        return res.status(500).json({ error: 'Missing Authorization Bearer token for Supabase finalize_order.' });
      }

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });

      const { data: supabaseOrderId, error: finalizeError } = await supabase.rpc('finalize_order', {
        p_square_order_id: orderId,
        p_square_payment_id: result.payment.id,
        p_customer_info: { email: buyerEmail },
        p_shipping_info: shippingAddress ?? billingAddress ?? null,
      });

      if (finalizeError) {
        return res.status(500).json({
          error: 'Payment succeeded but order finalization failed',
          message: finalizeError.message,
        });
      }

      return res.status(200).json({
        success: true,
        payment: {
          id: result.payment.id,
          status: result.payment.status,
          amountMoney: result.payment.amountMoney
            ? {
                amount: typeof result.payment.amountMoney.amount === 'bigint'
                  ? Number(result.payment.amountMoney.amount)
                  : result.payment.amountMoney.amount,
                currency: result.payment.amountMoney.currency,
              }
            : undefined,
          orderId: result.payment.orderId,
          createdAt: result.payment.createdAt,
          updatedAt: result.payment.updatedAt
        },
        orderId: orderId,
        supabaseOrderId
      });
    } else {
      return res.status(400).json({
        error: 'Payment creation failed',
        errors: result?.errors
      });
    }

  } catch (error) {
    console.error('Payment creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

