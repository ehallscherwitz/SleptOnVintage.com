// Header component - converted from vanilla HTML
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Header: React.FC = () => {
  const { cartCount } = useCart();
  const location = useLocation();

  // Helper function to determine if current page matches the button
  const isCurrentPage = (path: string) => location.pathname === path;

  return (
    <div className="header">
      <div className="header-left">
        <img className="logo" src="/photos/SOV_PFP.jpg" alt="SleptOnVintage Logo" />
        
        <div className="brand-name">
          SLEPTONVINTAGE
        </div>
      </div>
      
      <div className="header-center">
        <Link to="/">
          <button className={isCurrentPage('/') ? "homepage-home-button" : "home-button"}>
            Home
          </button>
        </Link>
        
        <Link to="/shirts">
          <button className={isCurrentPage('/shirts') ? "current-page-button" : "category-header-button"}>
            Shirts
          </button>
        </Link>
        
        <Link to="/sweaters">
          <button className={isCurrentPage('/sweaters') ? "current-page-button" : "category-header-button"}>
            Sweaters
          </button>
        </Link>
        
        <Link to="/hoodies">
          <button className={isCurrentPage('/hoodies') ? "current-page-button" : "category-header-button"}>
            Hoodies
          </button>
        </Link>
        
        <Link to="/jackets">
          <button className={isCurrentPage('/jackets') ? "current-page-button" : "category-header-button"}>
            Jackets
          </button>
        </Link>
        
        <Link to="/pants">
          <button className={isCurrentPage('/pants') ? "current-page-button" : "category-header-button"}>
            Pants
          </button>
        </Link>
        
        <Link to="/shorts">
          <button className={isCurrentPage('/shorts') ? "current-page-button" : "category-header-button"}>
            Shorts
          </button>
        </Link>
      </div>
      
      <div className="header-right">
        <button className="search-button">
          <i className="fas fa-search"></i>
          <div className="tooltip">Search</div>
        </button>
        
        <button className="user-button">
          <i className="fa-regular fa-user"></i>
          <div className="tooltip">User</div>
        </button>
        
        <Link to="/cart">
          <button className="cart-button">
            <i className="fa-solid fa-cart-shopping"></i>
            <div className="tooltip">Checkout</div>
            <span className="cart-counter">{cartCount}</span>
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Header;


