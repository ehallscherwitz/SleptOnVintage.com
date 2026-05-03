import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { formatUsdFromCents } from '../utils/money';
import { isAdminEmail } from '../utils/adminAccess';

type ProductRow = {
  id: number;
  name: string;
  price: number;
  size: string;
  category: string;
  available: boolean;
  storage_prefix?: string | null;
};

const AdminProductsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { products, error: err } = await adminService.listProducts();
    if (err) {
      setError(err);
      setRows([]);
    } else {
      setRows((products as ProductRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdminEmail(user.email)) return;
    void load();
  }, [authLoading, user, load]);

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
          <h1 className="admin-title">Listings</h1>
          <p className="admin-muted">You don’t have access to this page.</p>
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
            <h1 className="admin-title">Listings (admin)</h1>
            <p className="admin-sub">Open a product to edit details, photos, and order. Drag photos to reorder, then save order.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/admin/products/new" className="checkout-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              New listing
            </Link>
            <Link to="/admin" className="admin-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Orders
            </Link>
            <button type="button" className="admin-btn-secondary" onClick={() => void load()} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        {loading && <p className="admin-muted">Loading products…</p>}
        {error && <div className="checkout-alert checkout-alert--error">{error}</div>}

        {!loading && !error && rows.length === 0 && <p className="admin-muted">No products.</p>}

        {!loading && !error && rows.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Folder</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>${formatUsdFromCents(p.price)}</td>
                    <td>{p.category}</td>
                    <td className="admin-cell-muted">{p.storage_prefix || p.id}</td>
                    <td>
                      <Link to={`/admin/products/${p.id}`} className="checkout-link">
                        Edit
                      </Link>
                      {' · '}
                      <Link to={`/product/${p.id}`} className="checkout-link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="admin-footer-note" style={{ marginTop: 24 }}>
          <Link to="/" className="checkout-link">
            ← Back to shop
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminProductsPage;
