// Checkout service for handling order creation and payment processing
import { supabase } from '../lib/supabase';

export interface CheckoutCartItem {
  id: string;
  product_id: number;
  product: {
    id: number;
    name: string;
    price: number;
    size: string;
    image: string;
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

export const checkoutService = {
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

      return { data: cartItems || [], error: null };
    } catch (err) {
      console.error('Checkout service error:', err);
      return { data: [], error: err };
    }
  },

  // Create order via Square API
  async createOrder(cartItems: CheckoutCartItem[], customerInfo: CustomerInfo, shippingInfo: ShippingInfo): Promise<{ data: any; error: any }> {
    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems,
          customerInfo,
          shippingInfo
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: { message: data.error || 'Failed to create order' } };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Error creating order:', err);
      return { data: null, error: err };
    }
  },

  // Process payment via Square API
  async processPayment(sourceId: string, orderId: string, buyerEmail: string, shippingAddress: ShippingInfo, billingAddress?: ShippingInfo): Promise<{ data: any; error: any }> {
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId,
          orderId,
          buyerEmail,
          shippingAddress,
          billingAddress: billingAddress || shippingAddress // Use shipping as billing if not provided
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: { message: data.error || 'Failed to process payment' } };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Error processing payment:', err);
      return { data: null, error: err };
    }
  },

  // Calculate totals for display
  calculateTotals(cartItems: CheckoutCartItem[]): { subtotal: number; tax: number; total: number } {
    const subtotal = cartItems.reduce((sum, item) => sum + item.product.price, 0);
    const taxRate = 0.085; // 8.5% tax rate
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }
};

