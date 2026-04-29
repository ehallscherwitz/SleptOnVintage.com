import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { formatUsdFromCents } from '../utils/money';

interface OrderItem {
  id: string;
  product_id: number;
  name: string;
  size?: string;
}

interface AdminOrder {
  id: string;
  user_id: string;
  status: string;
  buyer_email: string | null;
  total: number;
  created_at: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  square_order_id?: string | null;
  order_items?: OrderItem[];
}

const STATUS_OPTIONS = ['paid', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];

const AdminDashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editing, setEditing] = useState<{
    orderId: string;
    status: string;
    carrier: string;
    tracking_number: string;
    tracking_url: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { orders: list, error } = await adminService.listOrders();
    if (error) {
      setLoadError(error);
      setOrders([]);
    } else {
      setOrders((list as AdminOrder[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (o: AdminOrder) => {
    setEditing({
      orderId: o.id,
      status: o.status || 'paid',
      carrier: o.carrier || 'usps',
      tracking_number: o.tracking_number || '',
      tracking_url: o.tracking_url || '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingId(editing.orderId);
    const status = editing.status;
    const { error } = await adminService.updateOrder({
      orderId: editing.orderId,
      status,
      carrier: editing.carrier,
      tracking_number: editing.tracking_number.trim() || null,
      tracking_url: editing.tracking_url.trim() || null,
      markShipped: status === 'shipped',
    });
    setSavingId(null);
    if (error) alert(error);
    else {
      setEditing(null);
      void load();
    }
  };

  const confirmDelete = async (o: AdminOrder) => {
    const ok = window.confirm(
      `Delete order ${o.id.slice(0, 8)}…?\n\nThis restores listed products as available for sale and removes the order from the database.`
    );
    if (!ok) return;
    setDeletingId(o.id);
    const { error } = await adminService.deleteOrder(o.id);
    setDeletingId(null);
    if (error) alert(error);
    else void load();
  };

  if (authLoading) {
    return (
      <div className="admin-page">
        <Header />
        <p className="admin-inner admin-muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-page">
        <Header />
        <div className="admin-inner">
          <h1 className="admin-title">Admin</h1>
          <p className="admin-muted">Sign in to access the dashboard.</p>
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
            <h1 className="admin-title">Orders (admin)</h1>
            <p className="admin-sub">Update status / tracking, or delete an order and restore inventory.</p>
          </div>
          <button type="button" className="admin-btn-secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading && <p className="admin-muted">Loading orders…</p>}
        {!loading && loadError && (
          <div className="checkout-alert checkout-alert--error">{loadError}</div>
        )}

        {!loading && !loadError && orders.length === 0 && (
          <p className="admin-muted">No orders yet.</p>
        )}

        {!loading && !loadError && orders.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Email</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Tracking</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                    <td className="admin-cell-muted">{o.buyer_email ?? '—'}</td>
                    <td>${formatUsdFromCents(Number(o.total))}</td>
                    <td>
                      <span className="order-badge">{o.status}</span>
                    </td>
                    <td className="admin-cell-muted">
                      {o.tracking_number || '—'}
                    </td>
                    <td className="admin-actions">
                      <button type="button" className="admin-btn-small" onClick={() => openEdit(o)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn-small admin-btn-danger"
                        disabled={deletingId === o.id}
                        onClick={() => void confirmDelete(o)}
                      >
                        {deletingId === o.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editing && (
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-edit-title">
            <div className="admin-modal">
              <h2 id="admin-edit-title" className="admin-modal-title">
                Update order
              </h2>
              <p className="admin-modal-id">{editing.orderId}</p>

              <label className="admin-label">Status</label>
              <select
                className="checkout-input"
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <label className="admin-label">Carrier</label>
              <input
                className="checkout-input"
                value={editing.carrier}
                onChange={(e) => setEditing({ ...editing, carrier: e.target.value })}
                placeholder="usps"
              />

              <label className="admin-label">Tracking number</label>
              <input
                className="checkout-input"
                value={editing.tracking_number}
                onChange={(e) => setEditing({ ...editing, tracking_number: e.target.value })}
                placeholder="9400…"
              />

              <label className="admin-label">Tracking URL (optional)</label>
              <input
                className="checkout-input"
                value={editing.tracking_url}
                onChange={(e) => setEditing({ ...editing, tracking_url: e.target.value })}
                placeholder="https://tools.usps.com/..."
              />

              <p className="admin-hint">Setting status to <strong>shipped</strong> also sets shipped time.</p>

              <div className="admin-modal-actions">
                <button type="button" className="checkout-btn-secondary" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="button" className="checkout-btn-primary" disabled={!!savingId} onClick={() => void saveEdit()}>
                  {savingId ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

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
