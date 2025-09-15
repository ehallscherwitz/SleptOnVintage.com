// Cart service for managing user cart data
import { supabase } from '../lib/supabase';

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: number;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items?: CartItem[];
}

export const cartService = {
  // Get or create user's cart
  async getOrCreateCart(): Promise<{ data: Cart | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'No authenticated user' } };

    // Try to get existing cart
    let { data: cart, error } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If no cart exists, create one
    if (error && error.code === 'PGRST116') {
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({ user_id: user.id })
        .select()
        .single();
      
      return { data: newCart, error: createError };
    }

    return { data: cart, error };
  },

  // Get cart with items
  async getCartWithItems(): Promise<{ data: Cart | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'No authenticated user' } };

    const { data, error } = await supabase
      .from('carts')
      .select(`
        *,
        items:cart_items(*)
      `)
      .eq('user_id', user.id)
      .single();

    return { data, error };
  },

  // Add item to cart
  async addToCart(productId: number): Promise<{ error: any }> {
    const { data: cart, error: cartError } = await this.getOrCreateCart();
    if (cartError || !cart) return { error: cartError };

    // Check if item already exists in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .single();

    if (existingItem) {
      // Item already exists, return success (no duplicate)
      return { error: null };
    } else {
      // Insert new item
      const { error } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: productId
        });
      
      return { error };
    }
  },


  // Remove item from cart
  async removeFromCart(productId: number): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'No authenticated user' } };

    // Get user's cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!cart) return { error: { message: 'Cart not found' } };

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('product_id', productId)
      .eq('cart_id', cart.id);

    return { error };
  },

  // Clear entire cart
  async clearCart(): Promise<{ error: any }> {
    const { data: cart, error: cartError } = await this.getOrCreateCart();
    if (cartError || !cart) return { error: cartError };

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    return { error };
  },

  // Get cart item count
  async getCartItemCount(): Promise<{ count: number; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0, error: { message: 'No authenticated user' } };

    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!cart) return { count: 0, error: { message: 'Cart not found' } };

    const { count, error } = await supabase
      .from('cart_items')
      .select('*', { count: 'exact', head: true })
      .eq('cart_id', cart.id);

    return { count: count || 0, error };
  },

  // Get cart items with product details
  async getCartItemsWithProducts(): Promise<{ data: any[]; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: { message: 'No authenticated user' } };

    // First get the user's cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!cart) return { data: [], error: { message: 'Cart not found' } };

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('cart_id', cart.id);

    return { data: data || [], error };
  },

  // Sync localStorage cart to database (for when user signs in)
  async syncLocalCartToDatabase(localCartItems: { id: number }[]): Promise<{ error: any }> {
    const { data: cart, error: cartError } = await this.getOrCreateCart();
    if (cartError || !cart) return { error: cartError };

    try {
      // Clear existing cart items
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      // Add local cart items to database
      if (localCartItems.length > 0) {
        const cartItems = localCartItems.map(item => ({
          cart_id: cart.id,
          product_id: item.id
        }));

        const { error } = await supabase
          .from('cart_items')
          .insert(cartItems);

        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }
};
