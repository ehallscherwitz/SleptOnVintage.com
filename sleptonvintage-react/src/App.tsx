import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';

// Import pages
import Homepage from './pages/Homepage';
import CategoryPage from './pages/CategoryPage';
import CartPage from './pages/CartPage';
import ProductDetailPage from './pages/ProductDetailPage';
import SearchPage from './pages/SearchPage';
import AuthCallback from './pages/AuthCallback';

// Import styles (remove default Vite styles)
import './styles/general.css';
import './styles/header.css';
import './styles/categories.css';
import './styles/products.css';
import './styles/cart.css';
import './styles/auth.css';
import './styles/product-detail.css';
import './styles/search.css';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Homepage />} />
              <Route path="/shirts" element={<CategoryPage category="shirts" title="Shirts" />} />
              <Route path="/sweaters" element={<CategoryPage category="sweaters" title="Sweaters" />} />
              <Route path="/hoodies" element={<CategoryPage category="hoodies" title="Hoodies" />} />
              <Route path="/jackets" element={<CategoryPage category="jackets" title="Jackets" />} />
              <Route path="/pants" element={<CategoryPage category="pants" title="Pants" />} />
              <Route path="/shorts" element={<CategoryPage category="shorts" title="Shorts" />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
