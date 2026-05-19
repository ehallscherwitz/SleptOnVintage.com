import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer-line-scroll">
        <p className="site-footer-line">Free shipping on all orders</p>
      </div>
      <div className="site-footer-line-scroll">
        <p className="site-footer-line">All items are preowned, check pictures for any signs of wear</p>
      </div>
      <div className="site-footer-line-scroll">
        <nav className="site-footer-legal" aria-label="Legal and contact">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
