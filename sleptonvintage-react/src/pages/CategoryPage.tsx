// CategoryPage component - generic page for displaying products by category
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { productService, type Product } from '../services/productService';

interface CategoryPageProps {
  category: Product['category'];
  title: string;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ category, title }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="product-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default CategoryPage;
