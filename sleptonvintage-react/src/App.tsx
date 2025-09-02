import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';

// Import pages
import Homepage from './pages/Homepage';
import CategoryPage from './pages/CategoryPage';
import CartPage from './pages/CartPage';

// Import styles (remove default Vite styles)
import './styles/general.css';
import './styles/header.css';
import './styles/categories.css';
import './styles/products.css';
import './styles/cart.css';

function App() {
  return (
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
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
