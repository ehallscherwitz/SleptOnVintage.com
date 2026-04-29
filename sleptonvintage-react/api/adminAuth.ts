import type { VercelRequest } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type AdminAuthResult =
  | { ok: true; email: string; service: SupabaseClient }
  | { ok: false; status: number; message: string };

/**
 * Verify the incoming Bearer JWT belongs to an email allowlisted in ADMIN_EMAILS,
 * then return a Supabase client using the service role key for admin DB operations.
 */
export async function requireAdmin(req: VercelRequest): Promise<AdminAuthResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, message: 'Server missing SUPABASE_URL / SUPABASE_ANON_KEY' };
  }
  if (!serviceKey) {
    return { ok: false, status: 500, message: 'Server missing SUPABASE_SERVICE_ROLE_KEY' };
  }
  if (allow.length === 0) {
    return { ok: false, status: 503, message: 'Admin not configured (ADMIN_EMAILS)' };
  }

  const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined;
  const jwt =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!jwt) {
    return { ok: false, status: 401, message: 'Missing Authorization Bearer token' };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr || !user?.email) {
    return { ok: false, status: 401, message: 'Invalid or expired session' };
  }

  if (!allow.includes(user.email.toLowerCase())) {
    return { ok: false, status: 403, message: 'Forbidden' };
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { ok: true, email: user.email, service };
}
