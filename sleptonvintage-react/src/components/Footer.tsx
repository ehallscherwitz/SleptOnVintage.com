import React from 'react';

const INSTAGRAM_URL = 'https://www.instagram.com/slept.on.vintage/';

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
        <a
          className="site-footer-link"
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="SleptOnVintage on Instagram"
        >
          <span className="site-footer-text">Contact us on Instagram for any questions or inquiries</span>
          <i className="fa-brands fa-instagram site-footer-instagram" aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
