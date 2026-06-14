import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Import pages
import Homepage from './pages/Homepage';
import CategoryPage from './pages/CategoryPage';
import CartPage from './pages/CartPage';
import ProductDetailPage from './pages/ProductDetailPage';
import SearchPage from './pages/SearchPage';
import AuthCallback from './pages/AuthCallback';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminProductEditPage from './pages/AdminProductEditPage';
import AdminNewListingPage from './pages/AdminNewListingPage';
import GiveawayPage from './pages/GiveawayPage';
import LovePage from './pages/LovePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import ContactPage from './pages/ContactPage';
import Footer from './components/Footer';
import { GiveawayWinnerPrompt } from './components/GiveawayWinnerPrompt';
import { ScrollToTop } from './components/ScrollToTop';

// Import styles (remove default Vite styles)
import './styles/general.css';
import './styles/header.css';
import './styles/categories.css';
import './styles/products.css';
import './styles/cart.css';
import './styles/auth.css';
import './styles/product-detail.css';
import './styles/search.css';
import './styles/checkout.css';
import './styles/admin.css';
import './styles/footer.css';
import './styles/legal.css';
import './styles/giveaway.css';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <ScrollToTop />
          <div className="App app-layout">
            <div className="app-main">
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
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/orders" element={<AdminOrdersPage />} />
                <Route path="/admin/products" element={<AdminProductsPage />} />
                <Route path="/admin/products/new" element={<AdminNewListingPage />} />
                <Route path="/admin/products/:id" element={<AdminProductEditPage />} />
                <Route path="/giveaway" element={<GiveawayPage />} />
                <Route path="/love" element={<LovePage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Routes>
            </div>
            <Footer />
          </div>
          <GiveawayWinnerPrompt />
          <Analytics />
          <SpeedInsights />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
