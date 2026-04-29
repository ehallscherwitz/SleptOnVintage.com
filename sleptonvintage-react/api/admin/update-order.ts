import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

  const patch: Record<string, unknown> = {};

  if (typeof body.status === 'string') patch.status = body.status;
  if (typeof body.carrier === 'string') patch.carrier = body.carrier;
  if (body.tracking_number === null) patch.tracking_number = null;
  else if (typeof body.tracking_number === 'string') patch.tracking_number = body.tracking_number;
  if (body.tracking_url === null) patch.tracking_url = null;
  else if (typeof body.tracking_url === 'string') patch.tracking_url = body.tracking_url;

  if (body.status === 'shipped' || body.markShipped) {
    patch.shipped_at = new Date().toISOString();
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await auth.service.from('orders').update(patch).eq('id', orderId).select().maybeSingle();

  if (error) {
    console.error('admin update order:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ order: data });
}
