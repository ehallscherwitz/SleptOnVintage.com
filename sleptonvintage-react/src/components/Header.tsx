// Header component - converted from vanilla HTML
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

const Header: React.FC = () => {
  const { cartCount } = useCart();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Helper function to determine if current page matches the button
  const isCurrentPage = (path: string) => location.pathname === path;

  const handleAuthClick = () => {
    setShowAuthModal(true);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

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
        
         {user ? (
           <div className="user-menu">
             <button 
               className="user-button"
               onClick={() => setShowUserMenu(!showUserMenu)}
             >
               <i className="fa-regular fa-user"></i>
               <div className="tooltip">Account</div>
             </button>
             
             {showUserMenu && (
               <div className="user-menu-dropdown">
                 <div className="user-menu-item">
                   {user.user_metadata?.full_name || user.email}
                 </div>
                 <button className="user-menu-item" onClick={handleSignOut}>
                   Sign Out
                 </button>
               </div>
             )}
           </div>
         ) : (
           <div className="user-menu">
             <button 
               className="user-button"
               onClick={() => setShowUserMenu(!showUserMenu)}
             >
               <i className="fa-regular fa-user"></i>
               <div className="tooltip">Account</div>
             </button>
             
             {showUserMenu && (
               <div className="user-menu-dropdown">
                 <button 
                   className="user-menu-item"
                   onClick={() => {
                     handleAuthClick();
                     setShowUserMenu(false);
                   }}
                 >
                   Sign In
                 </button>
               </div>
             )}
           </div>
         )}
        
        <Link to="/cart">
          <button className="cart-button">
            <i className="fa-solid fa-cart-shopping"></i>
            <div className="tooltip">Checkout</div>
            <span className="cart-counter">{cartCount}</span>
          </button>
        </Link>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default Header;


