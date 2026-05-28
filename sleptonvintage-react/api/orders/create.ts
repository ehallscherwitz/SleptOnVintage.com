import { VercelRequest, VercelResponse } from '@vercel/node';
import { SquareClient, SquareEnvironment } from 'square';
import { createClient } from '@supabase/supabase-js';
import { getPromoDiscountRate } from '../../server/promoCodes.js';

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
    if (!process.env.SQUARE_LOCATION_ID) {
      return res.status(500).json({ error: 'Missing SQUARE_LOCATION_ID env var on server.' });
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL / SUPABASE_ANON_KEY env vars on server.' });
    }

    const { cartItems, customerInfo, shippingInfo, promoCode } = req.body;

    // Validate required fields
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ 
        error: 'Cart items are required' 
      });
    }

    if (!customerInfo || !shippingInfo) {
      return res.status(400).json({ 
        error: 'Customer and shipping information are required' 
      });
    }

    // Validate customer info
    const requiredCustomerFields = ['firstName', 'lastName', 'email'];
    for (const field of requiredCustomerFields) {
      if (!customerInfo[field]) {
        return res.status(400).json({ 
          error: `Missing required customer field: ${field}` 
        });
      }
    }

    // Validate shipping info
    const requiredShippingFields = ['address1', 'city', 'state', 'zipCode'];
    for (const field of requiredShippingFields) {
      if (!shippingInfo[field]) {
        return res.status(400).json({ 
          error: `Missing required shipping field: ${field}` 
        });
      }
    }

    const promo = getPromoDiscountRate(promoCode);
    const promoApplied = Boolean(promo);
    const promoRate = promo?.rate ?? 0;
    const normalizedPromo = promo?.code ?? '';

    const productIds = [...new Set(cartItems.map((ci: any) => ci?.product_id).filter((id: any) => Number.isFinite(id)))];
    if (productIds.length !== cartItems.length) {
      return res.status(400).json({ error: 'Invalid cart items (missing product_id)' });
    }

    // Never trust client-supplied product price/name/availability.
    // Fetch authoritative product rows from Supabase and build the Square order from that.
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, price, size, image, category, available')
      .in('id', productIds);
    if (prodErr) {
      console.error('Order create: failed to fetch products:', prodErr);
      return res.status(500).json({ error: 'Failed to fetch product data' });
    }

    const byId = new Map<number, any>((products || []).map((p: any) => [p.id as number, p]));
    const sourceProducts = productIds.map((id) => byId.get(id)).filter(Boolean);
    if (sourceProducts.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products not found' });
    }

    const unavailable = sourceProducts.find((p: any) => !p.available);
    if (unavailable) {
      return res.status(409).json({ error: 'One or more items are no longer available' });
    }

    const subtotal = sourceProducts.reduce((sum: number, p: any) => sum + p.price, 0);
    const discountAmount = promoApplied ? Math.round(subtotal * promoRate) : 0;
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);

    const adjustedPrices = sourceProducts.map((p: any) => p.price);
    if (discountAmount > 0) {
      let remaining = discountAmount;
      for (let i = 0; i < adjustedPrices.length; i += 1) {
        const itemsLeft = adjustedPrices.length - i;
        const proposed = itemsLeft === 1 ? remaining : Math.floor(remaining / itemsLeft);
        const deduction = Math.min(adjustedPrices[i], proposed);
        adjustedPrices[i] -= deduction;
        remaining -= deduction;
      }
    }

    const orderItems = sourceProducts.map((product: any, idx: number) => ({
      name: `${product.name} - Size ${product.size}`,
      quantity: '1', // Always 1 for unique items
      basePriceMoney: {
        amount: BigInt(adjustedPrices[idx]), // already cents
        currency: 'USD' as const
      },
      note: `Product ID: ${product.id} | Category: ${product.category}`
    }));

    // Calculate tax (8.5% - adjust as needed)
    const taxRate = 0.085;
    const taxAmount = Math.round(discountedSubtotal * taxRate);
    const totalAmount = discountedSubtotal + taxAmount;

    // Create order
    const client = getSquareClient();
    const ordersApi = client.orders;
    const orderRequest = {
      idempotencyKey: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems: orderItems,
        taxes: [
          {
            name: 'Sales Tax',
            percentage: (taxRate * 100).toString(), // Convert to percentage string
            scope: 'ORDER' as const
          }
        ],
        pricingOptions: {
          autoApplyTaxes: true,
          autoApplyDiscounts: false
        },
        fulfillment: {
          type: 'SHIPMENT',
          state: 'PROPOSED',
          shipmentDetails: {
            recipient: {
              displayName: `${customerInfo.firstName} ${customerInfo.lastName}`,
              emailAddress: customerInfo.email,
              phoneNumber: customerInfo.phone || undefined,
              address: {
                addressLine1: shippingInfo.address1,
                addressLine2: shippingInfo.address2 || undefined,
                locality: shippingInfo.city,
                administrativeDistrictLevel1: shippingInfo.state,
                postalCode: shippingInfo.zipCode,
                country: 'US' as const
              }
            },
            carrier: 'OTHER',
            shippingNote: shippingInfo.notes || 'Slept On Vintage order'
          }
        }
      }
    };

    const result = await ordersApi.create(orderRequest);

    if (result?.order) {
      return res.status(200).json({
        success: true,
        order: {
          id: result.order.id,
          version: result.order.version,
          locationId: result.order.locationId,
          state: result.order.state
        },
        totals: {
          subtotal,
          discount: discountAmount,
          discountedSubtotal,
          tax: taxAmount,
          total: totalAmount
        },
        promo: {
          code: promoApplied ? normalizedPromo : null,
          discountRate: promoApplied ? promoRate : 0,
          applied: promoApplied
        },
        customerInfo: {
          name: `${customerInfo.firstName} ${customerInfo.lastName}`,
          email: customerInfo.email
        }
      });
    } else {
      return res.status(400).json({
        error: 'Order creation failed',
        errors: result?.errors
      });
    }

  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

