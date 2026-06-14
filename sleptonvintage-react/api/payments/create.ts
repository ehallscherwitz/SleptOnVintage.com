import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSquareClient, toNumberAmount } from '../../server/squareClient.js';
import { refundSquarePayment } from '../../server/squareRefund.js';
import { schedulePinterestSyncProductIds } from '../../server/pinterestSync.js';

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

    const { sourceId, orderId, buyerEmail, shippingAddress, billingAddress, customerInfo, promoCode } = req.body;

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

    const totalAmount = toNumberAmount(orderResult.order.totalMoney.amount);
    const taxAmount = toNumberAmount(orderResult.order.totalTaxMoney?.amount);
    const discountAmount = toNumberAmount(orderResult.order.totalDiscountMoney?.amount);
    const shippingAmount = 0;
    const subtotalAmount = Math.max(0, totalAmount - taxAmount - shippingAmount + discountAmount);

    // Create payment
    const paymentsApi = client.payments;
    const paymentRequest = {
      sourceId: sourceId,
      amountMoney: {
        amount: BigInt(totalAmount),
        currency: 'USD' as const
      },
      // Square requires idempotency keys <= 45 chars.
      // Use a stable key so client retries don't double-charge.
      idempotencyKey: `pay-${orderId}`.slice(0, 45),
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
        p_customer_info: customerInfo ?? { email: buyerEmail },
        p_shipping_info: shippingAddress ?? billingAddress ?? null,
        p_promo_code: promoCode ?? null,
        p_subtotal: subtotalAmount,
        p_discount: discountAmount,
        p_tax: taxAmount,
        p_shipping: shippingAmount,
        p_total: totalAmount,
      });

      if (!finalizeError && supabaseOrderId) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id')
          .eq('order_id', supabaseOrderId);
        const soldIds = (orderItems ?? [])
          .map((row: { product_id: number }) => row.product_id)
          .filter((id: number) => Number.isFinite(id));
        schedulePinterestSyncProductIds(soldIds);
      }

      if (finalizeError) {
        const finalizeMsg = finalizeError.message || 'Order finalization failed';
        const inventoryLost =
          /no longer available/i.test(finalizeMsg) || /cart is empty/i.test(finalizeMsg);

        let refunded = false;
        let refundNote: string | undefined;
        if (inventoryLost && result.payment.id) {
          const refund = await refundSquarePayment(
            result.payment.id,
            'Item sold before order could be completed',
          );
          refunded = refund.ok;
          if (!refund.ok) {
            refundNote = refund.message;
            console.error('Auto-refund failed after finalize_order:', refund.message, {
              paymentId: result.payment.id,
              finalizeMsg,
            });
          }
        }

        if (refunded) {
          return res.status(409).json({
            error:
              'An item in your cart was just sold to someone else. Your payment has been refunded.',
            message: finalizeMsg,
            refunded: true,
          });
        }

        return res.status(500).json({
          error: inventoryLost
            ? 'Payment succeeded but the item is no longer available. We could not automatically refund — contact us with your payment confirmation.'
            : 'Payment succeeded but order finalization failed',
          message: finalizeMsg,
          refunded: false,
          refundError: refundNote,
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

