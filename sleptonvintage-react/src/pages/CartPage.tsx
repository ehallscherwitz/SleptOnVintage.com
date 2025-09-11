// CartPage component - converted from cart-page.html
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { productService, type Product } from '../services/productService';

const CartPage: React.FC = () => {
  const { cart, removeFromCart } = useCart();
  const [cartProducts, setCartProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCartProducts = async () => {
      try {
        setLoading(true);
        const products = await productService.getAllProducts();
        
        const cartProductsWithDetails = cart.map(cartItem => {
          const product = products.find(product => product.id === cartItem.product_id);
          return product || null;
        }).filter(Boolean) as Product[];
        
        setCartProducts(cartProductsWithDetails);
      } catch (error) {
        console.error('Error fetching cart products:', error);
        setCartProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCartProducts();
  }, [cart]);

  const total = cartProducts.reduce((acc, product) => acc + (product?.price || 0), 0);

  const handleRemove = async (productId: number) => {
    console.log('Remove button clicked for product:', productId);
    try {
      await removeFromCart(productId);
      console.log('Item removed successfully');
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="subheader">Your Cart</div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Loading cart...
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      
      {cart.length === 0 ? (
        <div className="subheader">Your cart is empty!</div>
      ) : (
        <>
          <div className="subheader">Your Cart</div>
          
          <div className="cart-grid">
            <div className="cart-grid-title-row">
              <div className="cart-grid-product">Product</div>
              <div className="filler-div"></div>
              <div className="cart-grid-price">Price</div>
              <div className="filler-div"></div>
            </div>
            
            <div className="product-grid">
              {cartProducts.map(product => (
                <div key={product.id} className="product">
                  <div className="thumbnail-container">
                    <img className="cart-thumbnail" src={product.image} alt={product.name} />
                  </div>
                  
                  <div className="product-info">
                    <div className="product-title">{product.name}</div>
                    <div className="product-size">({product.size})</div>
                  </div>
                  
                  <div className="product-price">${product.price}</div>
                  
                  <div className="remove-button-container">
                    <button 
                      className="remove-button" 
                      onClick={() => handleRemove(product.id)}
                      type="button"
                      style={{ 
                        pointerEvents: 'auto',
                        userSelect: 'none'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="cart-total-text">Total: ${total.toFixed(2)}</div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;


