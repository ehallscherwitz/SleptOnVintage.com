import { supabase } from '../lib/supabase';

export interface DbOrder {
  id: string;
  user_id: string;
  subtotal: number;
  discount?: number;
  tax: number;
  shipping: number;
  total: number;
  status: string;
  buyer_email: string | null;
  promo_code?: string | null;
  shipping_name: string | null;
  shipping_address: Record<string, unknown> | null;
  square_order_id: string | null;
  square_payment_id: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: number;
  name: string;
  size: string;
  image: string | null;
  category: string | null;
  price: number;
  created_at: string;
}

export const orderService = {
  async listMyOrders(): Promise<{ data: DbOrder[]; error: Error | null }> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: new Error(error.message) };
    return { data: (data as DbOrder[]) ?? [], error: null };
  },

  async getOrderWithItems(orderId: string): Promise<{ data: (DbOrder & { order_items: DbOrderItem[] }) | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (error) return { data: null, error: new Error(error.message) };
    if (!data) return { data: null, error: null };

    const row = data as any;
    const items = (row.order_items as DbOrderItem[] | undefined) ?? [];
    return {
      data: { ...(row as DbOrder), order_items: items },
      error: null,
    };
  },
};
