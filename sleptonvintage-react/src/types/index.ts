export interface Product {
  id: string;
  name: string;
  price: number;
  size: string;
  image: string;
  available: boolean;
  category: 'shirts' | 'sweaters' | 'hoodies' | 'jackets' | 'pants' | 'shorts';
}

export interface CartItem {
  id: string;
  quantity: number;
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  resetCart: () => void;
  cartCount: number;
}


