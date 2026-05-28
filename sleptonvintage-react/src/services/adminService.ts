import { supabase } from '../lib/supabase';

const ADMIN_API = '/api/admin';

function networkErrorHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (import.meta.env.DEV && (msg === 'Failed to fetch' || msg.includes('fetch'))) {
    return `${msg} (local dev: add DEV_PROXY_API_TARGET to .env.local pointing at your deployed site, or run \`vercel dev\` from sleptonvintage-react.)`;
  }
  return msg;
}

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
      const response = await fetch(`${ADMIN_API}?op=list-orders`, { headers: await authHeaders() });
      const data = await parseJson(response);
      if (!response.ok) return { orders: [], error: data?.error || `HTTP ${response.status}` };
      return { orders: (data.orders as unknown[]) ?? [] };
    } catch (e) {
      return { orders: [], error: networkErrorHint(e) || 'Failed to load orders' };
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
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'update-order', ...body }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return {};
    } catch (e) {
      return { error: networkErrorHint(e) || 'Update failed' };
    }
  },

  async deleteOrder(orderId: string): Promise<{ error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'delete-order', orderId }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return {};
    } catch (e) {
      return { error: networkErrorHint(e) || 'Delete failed' };
    }
  },

  async listProducts(): Promise<{ products: unknown[]; error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${ADMIN_API}?op=list-products`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await parseJson(response);
      if (!response.ok) return { products: [], error: data?.error || `HTTP ${response.status}` };
      return { products: (data.products as unknown[]) ?? [] };
    } catch (e) {
      return { products: [], error: networkErrorHint(e) || 'Failed to load products' };
    }
  },

  async createProduct(body: {
    name: string;
    size: string;
    priceCents: number;
    category: string;
    available?: boolean;
    image?: string | null;
  }): Promise<{ product?: unknown; error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'create-product', ...body }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return { product: data.product };
    } catch (e) {
      return { error: networkErrorHint(e) || 'Create failed' };
    }
  },

  async getAdminProduct(productId: number): Promise<{ product?: unknown; storageObjectPrefix?: string; error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'get-product', productId }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return { product: data.product, storageObjectPrefix: data.storageObjectPrefix as string };
    } catch (e) {
      return { error: networkErrorHint(e) || 'Failed to load product' };
    }
  },

  async updateProduct(body: Record<string, unknown>): Promise<{ product?: unknown; error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'update-product', ...body }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return { product: data.product };
    } catch (e) {
      return { error: networkErrorHint(e) || 'Update failed' };
    }
  },

  async deleteProductListing(productId: number): Promise<{ error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'delete-product', productId }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return {};
    } catch (e) {
      return { error: networkErrorHint(e) || 'Delete failed' };
    }
  },

  async listProductImages(productId: number): Promise<{ files: { name: string; path: string; publicUrl: string }[]; prefix?: string; error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'product-images-list', productId }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { files: [], error: data?.error || `HTTP ${response.status}` };
      return { files: (data.files as { name: string; path: string; publicUrl: string }[]) || [], prefix: data.prefix as string };
    } catch (e) {
      return { files: [], error: networkErrorHint(e) || 'List failed' };
    }
  },

  async uploadProductImageBase64(body: {
    productId: number;
    fileName: string;
    contentType: string;
    dataBase64: string;
    replaceFileName?: string;
  }): Promise<{ path?: string; publicUrl?: string; product?: unknown; error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'product-image-upload', ...body }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return { path: data.path, publicUrl: data.publicUrl, product: data.product };
    } catch (e) {
      return { error: networkErrorHint(e) || 'Upload failed' };
    }
  },

  async downloadProductImage(
    productId: number,
    fileName: string
  ): Promise<{ contentType?: string; dataBase64?: string; error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'product-image-download', productId, fileName }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return { contentType: data.contentType as string, dataBase64: data.dataBase64 as string };
    } catch (e) {
      return { error: networkErrorHint(e) || 'Download failed' };
    }
  },

  async deleteProductImage(productId: number, fileName: string): Promise<{ error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'product-image-delete', productId, fileName }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return {};
    } catch (e) {
      return { error: networkErrorHint(e) || 'Delete failed' };
    }
  },

  async reorderProductImages(productId: number, orderedFileNames: string[]): Promise<{ error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'product-images-reorder', productId, orderedFileNames }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return {};
    } catch (e) {
      return { error: networkErrorHint(e) || 'Reorder failed' };
    }
  },

  async setPrimaryImages(body?: {
    overwrite?: boolean;
    limit?: number;
  }): Promise<{
    data?: {
      scanned?: number;
      updated?: number;
      skipped?: number;
      missing?: number;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'set-primary-images', ...(body || {}) }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return { data };
    } catch (e) {
      return { error: networkErrorHint(e) || 'Request failed' };
    }
  },

  async syncPinterestCatalog(): Promise<{
    data?: {
      ok?: boolean;
      synced?: number;
      skipped?: number;
      errors?: string[];
      pinterest?: {
        apiBase: string;
        sandboxEnv: string;
        tokenKind: string;
        hasAdAccountId: boolean;
      };
    };
    error?: string;
  }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'sync-pinterest-catalog' }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return { data };
    } catch (e) {
      return { error: networkErrorHint(e) || 'Request failed' };
    }
  },

  async createGiveaway(body: {
    productId: number;
    durationSeconds: number;
  }): Promise<{ giveaway?: unknown; error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'create-giveaway', ...body }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return { giveaway: data.giveaway };
    } catch (e) {
      return { error: networkErrorHint(e) || 'Create giveaway failed' };
    }
  },

  async cancelGiveaway(body: { productId: number }): Promise<{ ok?: boolean; error?: string }> {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ op: 'cancel-giveaway', ...body }),
      });
      const data = await parseJson(response);
      if (!response.ok) return { error: data?.error || `HTTP ${response.status}` };
      return { ok: true };
    } catch (e) {
      return { error: networkErrorHint(e) || 'Cancel giveaway failed' };
    }
  },
};
