// CategoryPage component - generic page for displaying products by category
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { productService, type Product } from '../services/productService';

interface CategoryPageProps {
  category: Product['category'];
  title: string;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ category, title }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const categoryProducts = await productService.getProductsByCategory(category);
        setProducts(categoryProducts);
      } catch (err) {
        setError('Failed to load products');
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category]);

  const handleAddToCart = (productId: number) => {
    addToCart(productId);
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="subheader">{title}</div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Loading products...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className="subheader">{title}</div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="subheader">{title}</div>
      <div className="category-grid">
        {products.map(product => (
          <div key={product.id} className="category">
            <div className="thumbnail-row">
              <img className="thumbnail" src={product.image} alt={product.name} />
            </div>
            <div className="category-info-row">
              <div className="category-title" style={{ fontSize: '14px' }}>
                {product.name} ({product.size}) ${product.price}
              </div>
            </div>
            <div className="category-info-row">
              <button 
                className="add-to-cart-btn"
                onClick={() => product.available && handleAddToCart(product.id)}
                disabled={!product.available}
                style={{ 
                  cursor: product.available ? 'pointer' : 'default',
                  opacity: product.available ? 1 : 0.6
                }}
              >
                {product.available ? 'Add to Cart' : 'Sold Out'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPage;
