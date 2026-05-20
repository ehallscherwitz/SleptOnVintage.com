// ProductDetailPage component - displays individual product details
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { PageHeadingRow } from '../components/PageHeadingRow';
import { useAuth } from '../context/AuthContext';
import { getPrimaryProductImageUrl, productService, resolveProductImageUrls, type Product } from '../services/productService';
import { useCart } from '../context/CartContext';
import { formatUsdFromCents } from '../utils/money';
import { isAdminEmail } from '../utils/adminAccess';
import { Seo, JsonLd } from '../components/Seo';
import {
  buildProductCanonicalPath,
  buildProductImageAlt,
  buildProductJsonLd,
  buildProductMetaDescription,
  buildProductImageAltShort,
  buildProductCanonicalUrl,
  buildProductOgImage,
  buildProductOgTitle,
  buildProductPageTitle,
  buildProductPinDescription,
  buildProductKeywords,
} from '../utils/productSeo';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, cart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError('Product ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const productData = await productService.getProductById(parseInt(id));

        if (!productData) {
          setError('Product not found');
          setImageUrls([]);
        } else {
          setProduct(productData);
          const urls = await resolveProductImageUrls(productData, getPrimaryProductImageUrl(productData));
          setImageUrls(urls);
          setActiveImageIndex(0);
        }
      } catch (err) {
        setError('Failed to load product');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);
    try {
      await addToCart(product.id);
      // You could add a success message here
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBackToCategory = () => {
    if (product) {
      navigate(`/${product.category}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <PageHeadingRow title="Listing" />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Loading product details...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div>
        <Header />
        <PageHeadingRow title="Listing" />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>{error || 'The product you are looking for does not exist.'}</p>
          <button 
            className="back-button"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const mainAlt = buildProductImageAltShort(product);

  return (
    <div>
      <Seo
        title={buildProductPageTitle(product)}
        description={buildProductMetaDescription(product)}
        ogTitle={buildProductOgTitle(product)}
        ogDescription={buildProductPinDescription(product)}
        keywords={buildProductKeywords(product)}
        canonicalPath={buildProductCanonicalPath(product)}
        ogType="product"
        ogImage={buildProductOgImage(imageUrls)}
        productPriceCents={product.price}
        productAvailable={product.available}
      />
      <JsonLd data={buildProductJsonLd(product, imageUrls)} />
      <Header />
      <PageHeadingRow title="Listing" />

      <main className="product-detail-container">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span> / </span>
          <Link to={`/${product.category}`}>
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </Link>
          <span> / </span>
          <span>{product.name}</span>
        </div>

        <div className="product-detail-grid">
          <div className="product-image-section">
            <div className="product-gallery">
              <div className="product-gallery-main">
                {imageUrls.length > 0 ? (
                  <>
                    <img
                      className="product-detail-image"
                      src={imageUrls[activeImageIndex]}
                      alt={mainAlt}
                      title={buildProductOgTitle(product)}
                      data-pin-description={buildProductPinDescription(product)}
                      data-pin-url={buildProductCanonicalUrl(product)}
                      loading="eager"
                      decoding="async"
                    />
                    {imageUrls.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="product-gallery-nav product-gallery-prev"
                          aria-label="Previous photo"
                          onClick={() =>
                            setActiveImageIndex((i: number) =>
                              i === 0 ? imageUrls.length - 1 : i - 1
                            )
                          }
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="product-gallery-nav product-gallery-next"
                          aria-label="Next photo"
                          onClick={() =>
                            setActiveImageIndex((i: number) =>
                              i >= imageUrls.length - 1 ? 0 : i + 1
                            )
                          }
                        >
                          ›
                        </button>
                        <span className="product-gallery-counter">
                          {activeImageIndex + 1} / {imageUrls.length}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <div className="product-gallery-empty">No image</div>
                )}
              </div>
              {imageUrls.length > 1 && (
                <div className="product-gallery-thumbs" role="tablist" aria-label="Product photos">
                  {imageUrls.map((url, idx) => (
                    <button
                      key={`${idx}-${url}`}
                      type="button"
                      role="tab"
                      aria-selected={idx === activeImageIndex}
                      className={`product-gallery-thumb ${idx === activeImageIndex ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                    >
                      <img
                        src={url}
                        alt={buildProductImageAlt(product, {
                          photoIndex: idx,
                          totalPhotos: imageUrls.length,
                          context: 'thumb',
                        })}
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="product-info-section">
            <h1 className="product-detail-title">{product.name}</h1>
            
            <div className="product-detail-price">${formatUsdFromCents(product.price)}</div>
            
            <div className="product-detail-size">
              <span className="size-label">Size: </span>
              <span className="size-value">{product.size}</span>
            </div>

            <div className="product-detail-category">
              <span className="category-label">Category: </span>
              <span className="category-value">
                {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
              </span>
            </div>

            <div className="product-detail-availability">
              <span className={`availability-badge ${product.available ? 'available' : 'unavailable'}`}>
                {product.available ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            <div className="product-actions">
              <button 
                className={`${cart.some(item => item.product_id === product.id) ? 'in-cart-button' : 'add-to-cart-button'} ${!product.available ? 'disabled' : ''}`}
                onClick={handleAddToCart}
                disabled={!product.available || addingToCart || cart.some(item => item.product_id === product.id)}
              >
                {addingToCart ? 'Adding...' : 
                 cart.some(item => item.product_id === product.id) ? 'In Cart' : 
                 'Add to Cart'}
              </button>
              
              <button 
                className="back-to-category-button"
                onClick={handleBackToCategory}
              >
                Back to {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
              </button>

              {isAdminEmail(user?.email) && (
                <Link to={`/admin/products/${product.id}`} className="admin-edit-detail-btn">
                  Edit listing
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetailPage;