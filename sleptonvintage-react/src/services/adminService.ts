import { supabase } from '../lib/supabase';

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export const adminService = {
  async listOrders(): Promise<{ orders: unknown[]; error?: string }> {
    try {
      const response = await fetch('/api/admin/list-orders', { headers: await authHeaders() });
      const data = await parseJson(response);
      if (!response.ok) return { orders: [], error: data?.error || `HTTP ${response.status}` };
      return { orders: (data.orders as unknown[]) ?? [] };
    } catch (e) {
      return { orders: [], error: e instanceof Error ? e.message : 'Failed to load orders' };
    }
  },

  async updateOrder(body: {
    orderId: string;
    status?: string;
    carrier?: string;
    tracking_number?: string | null;
    tracking_url?: string | null;
    markShipped?: boolean;
  }): Promise<{ error?: string }> {
    try {
      const response = await fetch('/api/admin/update-order', {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Update failed' };
    }
  },

  async deleteOrder(orderId: string): Promise<{ error?: string }> {
    try {
      const response = await fetch('/api/admin/delete-order', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ orderId }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Delete failed' };
    }
  },
};
