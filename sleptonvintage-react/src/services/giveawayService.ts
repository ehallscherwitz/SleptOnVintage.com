import { supabase } from '../lib/supabase';
import type { CustomerInfo, ShippingInfo } from './checkoutService';
import type { Product } from './productService';

export type GiveawayOrderNeedingShipping = {
  id: string;
  productName: string;
};

export type GiveawayPublic = {
  id: string;
  product_id: number;
  starts_at: string;
  ends_at: string;
  resolved_at: string | null;
  winner_name: string | null;
  winner_email: string | null;
  winner_order_id: string | null;
  product_name: string;
  product_size: string;
  product_price: number;
  product_image: string | null;
  product_category: Product['category'] | string;
  product_available: boolean;
  product_updated_at: string | null;
  product_storage_prefix: string | null;
};

export type GiveawayEntry = {
  id: string;
  giveaway_id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
};

function isDuplicateGiveawayEntry(error: { code?: string; message?: string; details?: string }): boolean {
  if (error.code === '23505') return true;
  const msg = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    msg.includes('duplicate') ||
    msg.includes('unique') ||
    msg.includes('already exists') ||
    msg.includes('giveaway_entries_giveaway_id_user_id')
  );
}

function friendlyGiveawayEnterError(error: { code?: string; message?: string }): string {
  if (isDuplicateGiveawayEntry(error)) return 'You have already entered.';
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('not authenticated') || msg.includes('sign in')) return 'Sign in required.';
  if (msg.includes('row-level security') || msg.includes('policy')) {
    return 'Giveaway entry is closed or unavailable right now.';
  }
  return 'Could not enter the giveaway. Please try again.';
}

function safeNameFromUser(u: any): string {
  const raw =
    u?.user_metadata?.full_name ??
    u?.user_metadata?.name ??
    u?.user_metadata?.given_name ??
    u?.user_metadata?.preferred_username ??
    null;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  const email = typeof u?.email === 'string' ? u.email.trim() : '';
  if (email.includes('@')) return email.split('@')[0];
  return 'Guest';
}

export const giveawayService = {
  async getActiveGiveawayPublic(): Promise<{ giveaway: GiveawayPublic | null; error: string | null }> {
    const { data, error } = await supabase.from('active_giveaway_public').select('*').limit(1).maybeSingle();
    if (error) return { giveaway: null, error: error.message };
    return { giveaway: (data as GiveawayPublic) ?? null, error: null };
  },

  async listEntries(giveawayId: string): Promise<{ entries: GiveawayEntry[]; error: string | null }> {
    const { data, error } = await supabase
      .from('giveaway_entries')
      .select('*')
      .eq('giveaway_id', giveawayId)
      .order('created_at', { ascending: true });
    if (error) return { entries: [], error: error.message };
    return { entries: (data as GiveawayEntry[]) ?? [], error: null };
  },

  async enter(
    giveawayId: string
  ): Promise<{ ok: boolean; alreadyEntered?: boolean; error: string | null }> {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { ok: false, error: 'Sign in required.' };

    const fullName = safeNameFromUser(user);
    const email = (user.email || '').trim();
    if (!email) return { ok: false, error: 'No email found on your account.' };

    const { error } = await supabase.from('giveaway_entries').insert({
      giveaway_id: giveawayId,
      user_id: user.id,
      full_name: fullName,
      email,
    });

    if (error) {
      if (isDuplicateGiveawayEntry(error)) {
        return { ok: true, alreadyEntered: true, error: null };
      }
      return { ok: false, error: friendlyGiveawayEnterError(error) };
    }
    return { ok: true, error: null };
  },

  async resolve(giveawayId: string): Promise<{ data: any; error: string | null }> {
    const { data, error } = await supabase.rpc('resolve_giveaway', { p_giveaway_id: giveawayId });
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async getOrderNeedingShipping(): Promise<{ order: GiveawayOrderNeedingShipping | null; error: string | null }> {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { order: null, error: null };

    const { data, error } = await supabase
      .from('orders')
      .select('id, shipping_address, order_items(name)')
      .eq('user_id', user.id)
      .eq('status', 'giveaway')
      .is('shipping_address', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { order: null, error: error.message };
    if (!data?.id) return { order: null, error: null };

    const items = (data as { order_items?: { name: string }[] }).order_items;
    const productName = items?.[0]?.name?.trim() || 'your giveaway prize';

    return { order: { id: data.id as string, productName }, error: null };
  },

  async submitWinnerShipping(body: {
    orderId: string;
    customerInfo: CustomerInfo;
    shippingInfo: ShippingInfo;
  }): Promise<{ ok: boolean; error: string | null }> {
    const { error } = await supabase.rpc('submit_giveaway_winner_shipping', {
      p_order_id: body.orderId,
      p_customer_info: body.customerInfo,
      p_shipping_info: body.shippingInfo,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  },
};

