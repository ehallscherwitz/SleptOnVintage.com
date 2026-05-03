import React from 'react';

const INSTAGRAM_URL = 'https://www.instagram.com/slept.on.vintage/';

const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <a
        className="site-footer-link"
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="SleptOnVintage on Instagram"
      >
        <span className="site-footer-text">
          Contact us on Instagram for any questions or inquiries
        </span>
        <i className="fa-brands fa-instagram site-footer-instagram" aria-hidden="true" />
      </a>
    </footer>
  );
};

export default Footer;
