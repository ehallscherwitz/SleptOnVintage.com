// SearchPage component - displays all products with search functionality
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { productService, type Product } from '../services/productService';

const SearchPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const { addToCart, cart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const allProducts = await productService.getAllProducts();
        setProducts(allProducts);
        setFilteredProducts(allProducts);
      } catch (err) {
        setError('Failed to load products');
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products]; // Create a copy to avoid mutation

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.size.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        default:
          return 0;
      }
    });

    console.log('Sorting by:', sortBy, 'Products count:', filtered.length);
    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, sortBy]);

  const handleAddToCart = (productId: number) => {
    addToCart(productId);
  };

  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'shirts', label: 'Shirts' },
    { value: 'sweaters', label: 'Sweaters' },
    { value: 'hoodies', label: 'Hoodies' },
    { value: 'jackets', label: 'Jackets' },
    { value: 'pants', label: 'Pants' },
    { value: 'shorts', label: 'Shorts' }
  ];

  const sortOptions = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'price-asc', label: 'Price Low to High' },
    { value: 'price-desc', label: 'Price High to Low' }
  ];

  if (loading) {
    return (
      <div>
        <Header />
        <div className="subheader">Search Products</div>
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
        <div className="subheader">Search Products</div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="subheader">Search Products</div>
      
      <div className="search-container">
        <div className="search-filters">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="category-filter-container">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sort-filter-container">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-filter"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-results">
          <div className="results-count">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
          </div>
          
          {filteredProducts.length === 0 ? (
            <div className="no-results">
              <p>No products found matching your search.</p>
              <p>Try adjusting your search terms or category filter.</p>
            </div>
          ) : (
            <div className="category-grid">
              {filteredProducts.map(product => (
                <div key={product.id} className="category">
                  <Link to={`/product/${product.id}`} className="product-link">
                    <div className="thumbnail-row">
                      <img className="thumbnail" src={product.image} alt={product.name} />
                    </div>
                    <div className="category-info-row">
                      <div className="category-title" style={{ fontSize: '14px' }}>
                        {product.name} ({product.size}) ${product.price}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
