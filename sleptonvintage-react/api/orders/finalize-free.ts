import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { schedulePinterestSyncProductIds } from '../../server/pinterestSync.js';
import { getPromoDiscountRate } from '../../server/promoCodes.js';

function parseBody(req: VercelRequest): Record<string, unknown> {
  try {
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}') as Record<string, unknown>;
    if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  } catch {
    /* empty */
  }
  return {};
}

const TAX_RATE = 0.085;

function priceCents(value: unknown): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL / SUPABASE_ANON_KEY env vars on server.' });
    }

    const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined;
    const jwt =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!jwt) {
      return res.status(401).json({ error: 'Sign in required.' });
    }

    const body = parseBody(req);
    const { customerInfo, shippingInfo, promoCode } = body as {
      customerInfo?: Record<string, unknown>;
      shippingInfo?: Record<string, unknown>;
      promoCode?: string;
    };

    if (!customerInfo || !shippingInfo) {
      return res.status(400).json({ error: 'Customer and shipping information are required' });
    }

    const requiredCustomerFields = ['firstName', 'lastName', 'email'];
    for (const field of requiredCustomerFields) {
      if (!customerInfo[field]) {
        return res.status(400).json({ error: `Missing required customer field: ${field}` });
      }
    }

    const requiredShippingFields = ['address1', 'city', 'state', 'zipCode'];
    for (const field of requiredShippingFields) {
      if (!shippingInfo[field]) {
        return res.status(400).json({ error: `Missing required shipping field: ${field}` });
      }
    }

    const promo = getPromoDiscountRate(promoCode);
    const promoApplied = Boolean(promo);
    const promoRate = promo?.rate ?? 0;
    const normalizedPromo = promo?.code ?? '';

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return res.status(401).json({ error: 'Invalid session.' });
    }

    const { data: cart, error: cartErr } = await supabase.from('carts').select('id').eq('user_id', user.id).maybeSingle();
    if (cartErr) {
      console.error('finalize-free cart:', cartErr);
      return res.status(500).json({ error: 'Could not load cart.' });
    }
    if (!cart?.id) {
      return res.status(400).json({ error: 'Cart not found.' });
    }

    const { data: cartRows, error: itemsErr } = await supabase
      .from('cart_items')
      .select('product_id')
      .eq('cart_id', cart.id);
    if (itemsErr) {
      console.error('finalize-free cart_items:', itemsErr);
      return res.status(500).json({ error: 'Could not load cart items.' });
    }
    const rows = cartRows || [];
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    const productIds = [...new Set(rows.map((r: { product_id: number }) => r.product_id).filter((id: number) => Number.isFinite(id)))];
    if (productIds.length !== rows.length) {
      return res.status(400).json({ error: 'Invalid cart items.' });
    }

    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, price, size, image, category, available')
      .in('id', productIds);
    if (prodErr) {
      console.error('finalize-free products:', prodErr);
      return res.status(500).json({ error: 'Failed to fetch product data.' });
    }

    const byId = new Map<number, Record<string, unknown>>((products || []).map((p: Record<string, unknown>) => [p.id as number, p]));
    const sourceProducts = productIds.map((id) => byId.get(id)).filter(Boolean) as Record<string, unknown>[];
    if (sourceProducts.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products not found.' });
    }

    const unavailable = sourceProducts.find((p) => !p.available);
    if (unavailable) {
      return res.status(409).json({ error: 'One or more items are no longer available.' });
    }

    const subtotal = sourceProducts.reduce((sum: number, p: Record<string, unknown>) => sum + priceCents(p.price), 0);
    const discountAmount = promoApplied ? Math.round(subtotal * promoRate) : 0;
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(discountedSubtotal * TAX_RATE);
    const totalAmount = discountedSubtotal + taxAmount;

    if (totalAmount !== 0) {
      return res.status(400).json({
        error: 'Free checkout only applies when your order total is $0.00. Use card checkout for paid orders.',
      });
    }

    // Complimentary listings live at price = 0. Block multi-line $0 grabs in one checkout.
    const freeListingLineCount = rows.filter((row: { product_id: number }) => priceCents(byId.get(row.product_id)?.price) === 0)
      .length;
    if (freeListingLineCount > 1) {
      return res.status(400).json({
        error: 'Only one complimentary item may be checked out at a time. Remove extra free items from your cart.',
      });
    }

    const FREE_CHECKOUT_LIMIT_DAYS = 14; // keep in sync with FREE_CHECKOUT_INTERVAL_DAYS in src/constants/legal.ts

    const skipFreeLimit =
      String(process.env.FREE_ORDER_ONE_PER_DAY_DISABLED || '').trim().toLowerCase() === 'true' ||
      String(process.env.FREE_ORDER_LIMIT_DISABLED || '').trim().toLowerCase() === 'true';

    if (!skipFreeLimit) {
      const { data: recentCountRaw, error: limitErr } = await supabase.rpc('count_free_checkouts_in_last_days', {
        p_days: FREE_CHECKOUT_LIMIT_DAYS,
      });
      if (limitErr) {
        console.error('finalize-free limit RPC:', limitErr);
        return res.status(503).json({
          error:
            'Free-checkout limit check is unavailable. Add the RPC from supabase-free-item-limit.sql or contact support.',
        });
      }
      const recentCount =
        typeof recentCountRaw === 'number' ? recentCountRaw : Number.parseInt(String(recentCountRaw ?? '0'), 10) || 0;
      if (recentCount >= 1) {
        return res.status(409).json({
          error:
            'You’ve already claimed a complimentary item in the last 2 weeks (one per account every 2 weeks). Please try again later.',
        });
      }
    }

    const { data: supabaseOrderId, error: finalizeError } = await supabase.rpc('finalize_order', {
      p_square_order_id: null,
      p_square_payment_id: null,
      p_customer_info: customerInfo,
      p_shipping_info: shippingInfo,
      p_promo_code: normalizedPromo || null,
      p_subtotal: subtotal,
      p_discount: discountAmount,
      p_tax: taxAmount,
      p_shipping: 0,
      p_total: totalAmount,
    });

    if (finalizeError) {
      console.error('finalize-free finalize_order:', finalizeError);
      return res.status(500).json({
        error: finalizeError.message || 'Could not complete order.',
      });
    }

    schedulePinterestSyncProductIds(productIds);

    return res.status(200).json({
      success: true,
      freeCheckout: true,
      supabaseOrderId,
      totals: {
        subtotal,
        discount: discountAmount,
        discountedSubtotal,
        tax: taxAmount,
        total: totalAmount,
      },
      promo: {
        code: promoApplied ? normalizedPromo : null,
        discountRate: promoApplied ? promoRate : 0,
        applied: promoApplied,
      },
    });
  } catch (error) {
    console.error('finalize-free error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
