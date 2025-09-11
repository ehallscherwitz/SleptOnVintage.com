// ProductCard component - displays individual product information
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../services/productService';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, loading, cart } = useCart();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id);
  };

  const handleProductClick = () => {
    console.log('Product clicked - attempting navigation to:', `/product/${product.id}`);
    // Force navigation as a fallback
    window.location.href = `/product/${product.id}`;
  };

  // Check if product is already in cart
  const isInCart = cart.some(item => item.product_id === product.id);

  return (
    <div className="product">
      <Link 
        to={`/product/${product.id}`} 
        className="product-link"
        onClick={handleProductClick}
      >
        <div className="thumbnail-row">
          <img 
            className="thumbnail" 
            src={product.image} 
            alt={product.name}
          />
        </div>
        
        <div className="product-info-row">
          <div className="product-title">{product.name}</div>
          <div className="product-size">({product.size})</div>
          <div className="product-price">${product.price}</div>
        </div>
      </Link>
      
      <div className="product-button-row">
        {product.available ? (
          <button 
            className={isInCart ? "in-cart-btn" : "add-to-cart-btn"} 
            onClick={handleAddToCart}
            disabled={loading || isInCart}
          >
            {loading ? 'Adding...' : isInCart ? 'In Cart' : 'Add to Cart'}
          </button>
        ) : (
          <button className="sold-out-btn">
            Sold Out
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
