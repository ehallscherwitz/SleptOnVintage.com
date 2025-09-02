// CartPage component - converted from cart-page.html
import React from 'react';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { products } from '../data/products';

const CartPage: React.FC = () => {
  const { cart, removeFromCart } = useCart();

  // Get full product details for cart items
  const cartProducts = cart.map(cartItem => {
    const product = products.find(product => product.id === cartItem.id);
    return { ...product, quantity: cartItem.quantity };
  }).filter(Boolean); // Remove any undefined products

  const total = cartProducts.reduce((acc, product) => acc + (product?.price || 0), 0);

  const handleRemove = (productId: string) => {
    removeFromCart(productId);
  };

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
                product && (
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
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
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


