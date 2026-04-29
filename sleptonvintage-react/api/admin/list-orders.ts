import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAdmin(req);
  if (auth.ok === false) return res.status(auth.status).json({ error: auth.message });

  const { data, error } = await auth.service
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('admin list orders:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ orders: data ?? [] });
}
