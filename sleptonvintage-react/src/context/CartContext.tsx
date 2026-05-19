// Cart Context for managing cart state across the application
import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { cartService, type CartItem, type PrunedSoldCartItem } from '../services/cartService';
import { productService } from '../services/productService';
import type { ReactNode } from 'react';

interface CartContextType {
  cart: CartItem[];
  addToCart: (productId: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  resetCart: () => Promise<void>;
  cartCount: number;
  loading: boolean;
  error: string | null;
  /** Items removed from cart because they sold while in cart (latest prune pass). */
  soldRemovedFromCart: PrunedSoldCartItem[];
  clearSoldRemovedFromCart: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soldRemovedFromCart, setSoldRemovedFromCart] = useState<PrunedSoldCartItem[]>([]);

  // Load cart when user changes
  useEffect(() => {
    if (user) {
      // When user signs in, sync localStorage cart to database first
      syncLocalCartToDatabase();
    } else {
      // Fallback to localStorage for non-authenticated users
      loadCartFromLocalStorage();
    }
  }, [user]);

  const syncLocalCartToDatabase = async () => {
    // Get localStorage cart
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const localCart = JSON.parse(savedCart);
        if (localCart.length > 0) {
          // Sync to database
          const { error } = await cartService.syncLocalCartToDatabase(localCart);
          if (error) {
            console.error('Error syncing cart to database:', error);
          } else {
            // Clear localStorage after successful sync
            localStorage.removeItem('cart');
          }
        }
      } catch (err) {
        console.error('Error parsing localStorage cart for sync:', err);
      }
    }
    
    // Load cart from database
    await loadCartFromDatabase();
  };

  const pruneSoldFromLocalCart = async (items: CartItem[]): Promise<{ items: CartItem[]; removed: PrunedSoldCartItem[] }> => {
    if (items.length === 0) return { items, removed: [] };
    try {
      const products = await productService.getAllProducts();
      const byId = new Map(products.map((p) => [p.id, p]));
      const removed: PrunedSoldCartItem[] = [];
      const kept = items.filter((item) => {
        const p = byId.get(item.product_id);
        if (p && !p.available) {
          removed.push({ product_id: p.id, name: p.name });
          return false;
        }
        return true;
      });
      if (removed.length > 0) {
        const localCart = kept.map((item) => ({ id: item.product_id }));
        localStorage.setItem('cart', JSON.stringify(localCart));
      }
      return { items: kept, removed };
    } catch (err) {
      console.error('Error pruning local cart:', err);
      return { items, removed: [] };
    }
  };

  const loadCartFromDatabase = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { removed, error: pruneErr } = await cartService.pruneUnavailableFromCart();
      if (pruneErr) throw pruneErr;
      if (removed.length > 0) setSoldRemovedFromCart(removed);

      const { data, error } = await cartService.getCartWithItems();
      if (error) throw error;
      
      setCart(data?.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCartFromLocalStorage = useCallback(async () => {
    const savedCart = localStorage.getItem('cart');
    if (!savedCart) {
      setCart([]);
      return;
    }
    try {
      const localCart = JSON.parse(savedCart);
      const cartItems: CartItem[] = localCart.map((item: { id: number }) => ({
        id: `local-${item.id}`,
        cart_id: 'local',
        product_id: item.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const { items, removed } = await pruneSoldFromLocalCart(cartItems);
      if (removed.length > 0) setSoldRemovedFromCart(removed);
      setCart(items);
    } catch (err) {
      console.error('Error parsing localStorage cart:', err);
    }
  }, []);

  const addToCart = async (productId: number) => {
    if (!user) {
      // Fallback to localStorage for non-authenticated users
      addToLocalCart(productId);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await cartService.addToCart(productId);
      if (error) throw error;
      
      // Reload cart from database
      await loadCartFromDatabase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
      console.error('Error adding to cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToLocalCart = (productId: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product_id === productId);
      
      if (existingItem) {
        console.log(`Product with ID ${productId} is already in the cart.`);
        return prevCart;
      }
      
      const newItem: CartItem = {
        id: `local-${productId}`,
        cart_id: 'local',
        product_id: productId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const newCart = [...prevCart, newItem];
      
      // Save to localStorage
      const localCart = newCart.map(item => ({
        id: item.product_id
      }));
      localStorage.setItem('cart', JSON.stringify(localCart));
      
      return newCart;
    });
  };

  const removeFromCart = async (productId: number) => {
    if (!user) {
      removeFromLocalCart(productId);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await cartService.removeFromCart(productId);
      if (error) throw error;
      
      // Reload cart from database
      await loadCartFromDatabase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from cart');
      console.error('Error removing from cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromLocalCart = (productId: number) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.product_id !== productId);
      
      // Save to localStorage
      const localCart = newCart.map(item => ({
        id: item.product_id
      }));
      localStorage.setItem('cart', JSON.stringify(localCart));
      
      return newCart;
    });
  };

  const resetCart = async () => {
    if (!user) {
      setCart([]);
      localStorage.removeItem('cart');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await cartService.clearCart();
      if (error) throw error;
      
      setCart([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
      console.error('Error clearing cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const cartCount = cart.length;

  const clearSoldRemovedFromCart = () => setSoldRemovedFromCart([]);

  const refreshCart = useCallback(async () => {
    if (user) await loadCartFromDatabase();
    else await loadCartFromLocalStorage();
  }, [user, loadCartFromDatabase, loadCartFromLocalStorage]);

  const value: CartContextType = {
    cart,
    addToCart,
    removeFromCart,
    resetCart,
    cartCount,
    loading,
    error,
    soldRemovedFromCart,
    clearSoldRemovedFromCart,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
