// CategoryPage component - generic page for displaying products by category
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { PageHeadingRow } from '../components/PageHeadingRow';
import { useCart } from '../context/CartContext';
import { ProductThumbnail } from '../components/ProductThumbnail';
import { productService, type Product } from '../services/productService';
import { formatUsdFromCents } from '../utils/money';
import { Seo } from '../components/Seo';
import { buildCategoryMetaDescription, buildCategoryPageTitle } from '../utils/productSeo';

interface CategoryPageProps {
  category: Product['category'];
  title: string;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ category, title }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart, cart } = useCart();

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
        <PageHeadingRow title={title} />
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
        <PageHeadingRow title={title} />
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          {error}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div>
        <Header />
        <PageHeadingRow title={title} />
        <p className="category-page-empty">No {title} available, check back soon!</p>
      </div>
    );
  }

  return (
    <div>
      <Seo
        title={buildCategoryPageTitle(category)}
        description={buildCategoryMetaDescription(category)}
        canonicalPath={`/${category}`}
      />
      <Header />
      <PageHeadingRow title={title} />
      <div className="category-grid">
        {products.map(product => (
          <div key={product.id} className="category">
            <Link to={`/product/${product.id}`} className="product-link">
              <div className="thumbnail-row">
                <ProductThumbnail product={product} className="thumbnail" />
              </div>
              <div className="category-info-row category-info-row--product">
                <div className="category-product-text">
                  <div className="category-product-title">{product.name}</div>
                  <div className="category-product-meta">
                    {product.size} · ${formatUsdFromCents(product.price)}
                  </div>
                </div>
              </div>
            </Link>
            <div className="category-info-row">
              <button 
                className={product.available && cart.some(item => item.product_id === product.id) ? "in-cart-btn" : "add-to-cart-btn"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  product.available && handleAddToCart(product.id);
                }}
                disabled={!product.available || cart.some(item => item.product_id === product.id)}
                style={{ 
                  cursor: product.available ? 'pointer' : 'default',
                  opacity: product.available ? 1 : 0.6
                }}
              >
                {!product.available ? 'Sold Out' : 
                 cart.some(item => item.product_id === product.id) ? 'In Cart' : 
                 'Add to Cart'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPage;
