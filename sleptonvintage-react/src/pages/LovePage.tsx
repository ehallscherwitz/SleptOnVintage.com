// LovePage - feature page listing products tagged with the 'love' label
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { PageHeadingRow } from '../components/PageHeadingRow';
import { useCart } from '../context/CartContext';
import { ProductThumbnail } from '../components/ProductThumbnail';
import { productService, type Product } from '../services/productService';
import { formatUsdFromCents } from '../utils/money';
import { Seo } from '../components/Seo';
import { SITE_URL } from '../constants/site';

const LOVE_CATEGORY = 'love' as Product['category'];

const LovePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart, cart } = useCart();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const items = await productService.getProductsByCategory(LOVE_CATEGORY);
        if (!cancelled) setProducts(items);
      } catch (err) {
        console.error('Error loading love products:', err);
        if (!cancelled) setError('Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Seo
        title="Courtney Love T Shirts — Available Now"
        description="Hand screenprinted Courtney Love T shirts on thrifted blanks, designed by @jajin_ronin. No two are the same."
        canonicalPath="/love"
        ogImage={`${SITE_URL}/photos/IMG_0391.JPG`}
      />
      <Header />
      <PageHeadingRow title="Love" />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading products...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>{error}</div>
      ) : products.length === 0 ? (
        <p className="category-page-empty">Dropping soon, check back shortly!</p>
      ) : (
        <div className="category-grid">
          {products.map((product) => (
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
                  className={
                    product.available && cart.some((item) => item.product_id === product.id)
                      ? 'in-cart-btn'
                      : 'add-to-cart-btn'
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (product.available) addToCart(product.id);
                  }}
                  disabled={!product.available || cart.some((item) => item.product_id === product.id)}
                  style={{
                    cursor: product.available ? 'pointer' : 'default',
                    opacity: product.available ? 1 : 0.6,
                  }}
                >
                  {!product.available
                    ? 'Sold Out'
                    : cart.some((item) => item.product_id === product.id)
                      ? 'In Cart'
                      : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="cl-about">
        <p className="cl-about-credit">
          Designed by{' '}
          <a
            className="cl-credit-link"
            href="https://www.instagram.com/jajin_ronin/"
            target="_blank"
            rel="noopener noreferrer"
          >
            @jajin_ronin
          </a>
        </p>
        <p className="cl-about-note">
          All items screen printed by hand on thrifted blanks, no two are the same. This is an
          imperfect process, please review pictures. Wash inside out on delicate to preserve
          graphic.
        </p>
        <p className="cl-about-request">
          Don't see your size? Feel free to request, we will make one for you:{' '}
          <a
            className="cl-credit-link"
            href="https://www.instagram.com/slept.on.vintage/"
            target="_blank"
            rel="noopener noreferrer"
          >
            @slept.on.vintage
          </a>
        </p>
      </div>
    </div>
  );
};

export default LovePage;
