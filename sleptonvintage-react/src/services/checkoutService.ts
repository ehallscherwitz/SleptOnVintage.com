// Checkout service for handling order creation and payment processing
import { supabase } from '../lib/supabase';

export interface CheckoutCartItem {
  id: string;
  product_id: number;
  product: {
    id: number;
    name: string;
    // stored in cents
    price: number;
    size: string;
    image?: string | null;
    storage_prefix?: string | null;
    category: string;
  };
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface ShippingInfo {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  notes?: string;
}

export interface PromoResult {
  applied: boolean;
  code: string | null;
  discountRate: number;
}

function normalizePromoCode(raw?: string | null): string {
  return (raw || '').trim().toUpperCase();
}

function evaluatePromo(code?: string | null): PromoResult {
  const normalized = normalizePromoCode(code);
  if (normalized === 'SOV') {
    return { applied: true, code: normalized, discountRate: 0.1 };
  }
  return { applied: false, code: null, discountRate: 0 };
}

export const checkoutService = {
  async parseResponse(response: Response): Promise<{ ok: boolean; data: any; errorMessage?: string }> {
    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const msg =
        json?.error ||
        json?.message ||
        (typeof json === 'string' ? json : null) ||
        text ||
        `Request failed with status ${response.status}`;
      return { ok: false, data: json, errorMessage: msg };
    }

    return { ok: true, data: json ?? text };
  },

  // Get cart items with product details for checkout
  async getCartItemsForCheckout(): Promise<{ data: CheckoutCartItem[]; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: { message: 'No authenticated user' } };

    try {
      // Get user's cart
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!cart) return { data: [], error: { message: 'Cart not found' } };

      // Get cart items with product details
      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          product:products(
            id,
            name,
            price,
            size,
            image,
            category
          )
        `)
        .eq('cart_id', cart.id);

      if (error) {
        console.error('Error fetching cart items for checkout:', error);
        return { data: [], error };
      }

      // PostgREST may return the joined `products(...)` selection as an array.
      // Normalize it to a single object for the UI + Square order creation.
      const normalized: CheckoutCartItem[] = (cartItems || []).map((row: any) => {
        const productRaw = row.product;
        const product = Array.isArray(productRaw) ? productRaw[0] : productRaw;
        return {
          id: row.id,
          product_id: row.product_id,
          product,
        };
      }).filter((row: any) => row.product);

      return { data: normalized, error: null };
    } catch (err) {
      console.error('Checkout service error:', err);
      return { data: [], error: err };
    }
  },

  // Create order via Square API
  async createOrder(
    cartItems: CheckoutCartItem[],
    customerInfo: CustomerInfo,
    shippingInfo: ShippingInfo,
    promoCode?: string
  ): Promise<{ data: any; error: any }> {
    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems,
          customerInfo,
          shippingInfo,
          promoCode: normalizePromoCode(promoCode),
        })
      });

      const parsed = await this.parseResponse(response);
      if (!parsed.ok) return { data: null, error: { message: parsed.errorMessage || 'Failed to create order' } };
      return { data: parsed.data, error: null };
    } catch (err) {
      console.error('Error creating order:', err);
      return { data: null, error: err };
    }
  },

  // Process payment via Square API
  async processPayment(
    sourceId: string,
    orderId: string,
    buyerEmail: string,
    shippingAddress: ShippingInfo,
    billingAddress: ShippingInfo | undefined,
    customerInfo: CustomerInfo
  ): Promise<{ data: any; error: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          sourceId,
          orderId,
          buyerEmail,
          shippingAddress,
          billingAddress: billingAddress || shippingAddress, // Use shipping as billing if not provided
          customerInfo,
        })
      });

      const parsed = await this.parseResponse(response);
      if (!parsed.ok) return { data: null, error: { message: parsed.errorMessage || 'Failed to process payment' } };
      return { data: parsed.data, error: null };
    } catch (err) {
      console.error('Error processing payment:', err);
      return { data: null, error: err };
    }
  },

  // Calculate totals for display
  calculateTotals(
    cartItems: CheckoutCartItem[],
    promoCode?: string
  ): { subtotal: number; discount: number; tax: number; total: number; promo: PromoResult } {
    const subtotal = cartItems.reduce((sum, item) => sum + item.product.price, 0);
    const promo = evaluatePromo(promoCode);
    const discount = promo.applied ? Math.round(subtotal * promo.discountRate) : 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const taxRate = 0.085; // 8.5% tax rate
    const tax = Math.round(discountedSubtotal * taxRate);
    const total = discountedSubtotal + tax;

    return {
      subtotal,
      discount,
      tax,
      total,
      promo,
    };
  }
};

