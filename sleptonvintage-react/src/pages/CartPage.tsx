// CartPage component - converted from cart-page.html
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { getPrimaryProductImageUrl, productService, type Product } from '../services/productService';
import { formatUsdFromCents } from '../utils/money';

const CartPage: React.FC = () => {
  const { cart, removeFromCart } = useCart();
  const [cartProducts, setCartProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCartProducts = async () => {
      try {
        setLoading(true);
        const products = await productService.getAllProducts();

        const cartProductsWithDetails = cart
          .map((cartItem) => {
            const product = products.find((p) => p.id === cartItem.product_id);
            return product || null;
          })
          .filter(Boolean) as Product[];

        setCartProducts(cartProductsWithDetails);
      } catch (error) {
        console.error('Error fetching cart products:', error);
        setCartProducts([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchCartProducts();
  }, [cart]);

  const total = cartProducts.reduce((acc, product) => acc + (product?.price || 0), 0);

  const handleRemove = async (productId: number) => {
    try {
      await removeFromCart(productId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  if (loading) {
    return (
      <div className="cart-page-wrap">
        <Header />
        <div className="subheader">Your Cart</div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading cart...</div>
      </div>
    );
  }

  return (
    <div className="cart-page-wrap">
      <Header />

      {cart.length === 0 ? (
        <div className="subheader">Your cart is empty!</div>
      ) : (
        <>
          <div className="subheader">Your Cart</div>

          <div className="cart-grid">
            <div className="product-grid">
              {cartProducts.map((product) => (
                <div key={product.id} className="product">
                  <div className="thumbnail-container">
                    <img className="cart-thumbnail" src={getPrimaryProductImageUrl(product)} alt={product.name} />
                  </div>

                  <div className="product-info">
                    <div className="product-title">{product.name}</div>
                    <div className="product-size">({product.size})</div>
                  </div>

                  <div className="product-price">${formatUsdFromCents(product.price)}</div>

                  <div className="remove-button-container">
                    <button
                      className="remove-button"
                      onClick={() => void handleRemove(product.id)}
                      type="button"
                      style={{
                        pointerEvents: 'auto',
                        userSelect: 'none',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-total-text">Total: ${formatUsdFromCents(total)}</div>
          </div>

          <div className="cart-checkout-actions">
            <Link to="/checkout" className="cart-checkout-btn">
              Proceed to checkout
            </Link>
            <p className="cart-checkout-hint">You’ll confirm shipping and pay on the next step.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;
