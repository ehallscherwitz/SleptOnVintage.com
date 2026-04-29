import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../adminAuth.js';

/**
 * Deletes an order (cascades order_items), then sets products back to available = true
 * for each product_id that was in the order.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAdmin(req);
  if (auth.ok === false) return res.status(auth.status).json({ error: auth.message });

  let body: Record<string, unknown> = {};
  try {
    if (typeof req.body === 'string') body = JSON.parse(req.body || '{}');
    else if (req.body && typeof req.body === 'object') body = req.body as Record<string, unknown>;
  } catch {
    body = {};
  }
  const orderId = body.orderId as string | undefined;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const { data: items, error: itemsErr } = await auth.service.from('order_items').select('product_id').eq('order_id', orderId);

  if (itemsErr) {
    console.error('admin delete order (items):', itemsErr);
    return res.status(500).json({ error: itemsErr.message });
  }

  const productIds = [...new Set((items || []).map((r: { product_id: number }) => r.product_id))];

  if (productIds.length > 0) {
    const { error: availErr } = await auth.service.from('products').update({ available: true }).in('id', productIds);

    if (availErr) {
      console.error('admin delete order (products):', availErr);
      return res.status(500).json({ error: availErr.message });
    }
  }

  const { error: delErr } = await auth.service.from('orders').delete().eq('id', orderId);

  if (delErr) {
    console.error('admin delete order:', delErr);
    return res.status(500).json({ error: delErr.message });
  }

  return res.status(200).json({ success: true, restoredProductIds: productIds });
}
