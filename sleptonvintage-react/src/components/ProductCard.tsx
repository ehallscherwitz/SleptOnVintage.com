// ProductCard component - displays individual product information
import React from 'react';
import { useCart } from '../context/CartContext';
import type { Product } from '../services/productService';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, loading } = useCart();

  const handleAddToCart = async () => {
    await addToCart(product.id);
  };

  return (
    <div className="product">
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
      
      <div className="product-button-row">
        {product.available ? (
          <button 
            className="add-to-cart-btn" 
            onClick={handleAddToCart}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add to Cart'}
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
