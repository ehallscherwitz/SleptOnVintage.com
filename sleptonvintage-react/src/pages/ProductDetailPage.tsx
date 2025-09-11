// ProductDetailPage component - displays individual product details
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { productService, type Product } from '../services/productService';
import { useCart } from '../context/CartContext';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);

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
        } else {
          setProduct(productData);
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
        <div className="subheader">Loading Product...</div>
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
        <div className="subheader">Product Not Found</div>
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

  return (
    <div>
      <Header />
      <div className="subheader">{product.name}</div>
      
      <div className="product-detail-container">
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
            <img 
              className="product-detail-image" 
              src={product.image} 
              alt={product.name}
            />
          </div>

          <div className="product-info-section">
            <h1 className="product-detail-title">{product.name}</h1>
            
            <div className="product-detail-price">${product.price}</div>
            
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;