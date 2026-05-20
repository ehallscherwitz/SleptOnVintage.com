import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { AdminCatalogTools } from '../components/AdminCatalogTools';
import { useAuth } from '../context/AuthContext';
import { isAdminEmail } from '../utils/adminAccess';

const linkBtn = { textDecoration: 'none', display: 'inline-block', textAlign: 'center' as const, width: '100%' };

const AdminDashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="admin-page">
        <Header />
        <p className="admin-inner admin-muted">Loading…</p>
      </div>
    );
  }

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="admin-page">
        <Header />
        <div className="admin-inner">
          <h1 className="admin-title">Admin</h1>
          <p className="admin-muted">Sign in with an admin account to continue.</p>
          <Link to="/" className="checkout-link">
            ← Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Header />
      <div className="admin-inner">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-title">Admin</h1>
            <p className="admin-sub">Batch catalog tools and shortcuts to orders and listings.</p>
          </div>
        </div>

        <AdminCatalogTools />

        <section className="admin-hub-nav" aria-label="Admin sections">
          <h2 className="admin-hub-nav-title">Manage</h2>
          <div className="admin-hub-nav-links">
            <Link to="/admin/orders" className="checkout-btn-primary" style={linkBtn}>
              Orders
            </Link>
            <Link to="/admin/products" className="admin-btn-secondary" style={linkBtn}>
              Listings
            </Link>
            <Link to="/admin/products/new" className="admin-btn-secondary" style={linkBtn}>
              New listing
            </Link>
          </div>
        </section>

        <p className="admin-footer-note">
          <Link to="/" className="checkout-link">
            ← Back to shop
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
