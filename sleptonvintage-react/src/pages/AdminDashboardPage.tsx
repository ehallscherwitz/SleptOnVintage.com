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

type ShippingAddressSnap = {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
};

function formatShippingLines(addr: ShippingAddressSnap | Record<string, string> | null | undefined): string[] {
  if (!addr || typeof addr !== 'object') return [];
  const a = addr as ShippingAddressSnap;
  const line1 = [a.address1, a.address2].filter(Boolean).join(', ');
  const line2 = [a.city, a.state, a.zipCode].filter(Boolean).join(', ');
  const out: string[] = [];
  if (line1) out.push(line1);
  if (line2) out.push(line2);
  if (a.notes) out.push(`Notes: ${a.notes}`);
  return out;
}

interface AdminOrder {
  id: string;
  user_id: string;
  status: string;
  buyer_email: string | null;
  shipping_name?: string | null;
  shipping_address?: ShippingAddressSnap | Record<string, unknown> | null;
  promo_code?: string | null;
  total: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  created_at: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  square_order_id?: string | null;
  square_payment_id?: string | null;
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
  const [settingPrimaryImages, setSettingPrimaryImages] = useState(false);
  const [primaryImagesResult, setPrimaryImagesResult] = useState<string | null>(null);
  const [syncingPinterest, setSyncingPinterest] = useState(false);
  const [pinterestSyncResult, setPinterestSyncResult] = useState<string | null>(null);

  const [editing, setEditing] = useState<{
    orderId: string;
    status: string;
    carrier: string;
    tracking_number: string;
    tracking_url: string;
  } | null>(null);
  /** Full order snapshot for fulfillment details in the edit modal */
  const [editTarget, setEditTarget] = useState<AdminOrder | null>(null);

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
    setEditTarget(o);
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
      setEditTarget(null);
      void load();
    }
  };

  const confirmDelete = async (o: AdminOrder) => {
    const ok = window.confirm(
      `Delete order ${o.id.slice(0, 8)}…?\n\n` +
        `• Restores inventory in your database.\n` +
        `• Removes this order row from Supabase.\n\n` +
        `This does NOT refund the customer in Square. Refund separately in Square if money must be returned.\n\n` +
        `Continue?`
    );
    if (!ok) return;
    setDeletingId(o.id);
    const { error } = await adminService.deleteOrder(o.id);
    setDeletingId(null);
    if (error) alert(error);
    else void load();
  };

  const setPrimaryImagesFromStorage = async () => {
    const overwrite = window.confirm(
      'Overwrite ALL existing products.image values?\n\nOK = overwrite existing images (recommended if you want to switch everything to Storage paths).\nCancel = only fill missing images.'
    );

    const ok = window.confirm(
      `Set primary listing images from Storage?\n\nThis will scan images/products/{id}/ and pick the earliest uploaded file.\n\nMode: ${overwrite ? 'OVERWRITE existing products.image' : 'ONLY fill missing products.image'}`
    );
    if (!ok) return;

    setSettingPrimaryImages(true);
    setPrimaryImagesResult(null);
    const { data, error } = await adminService.setPrimaryImages({ overwrite, limit: 2000 });
    setSettingPrimaryImages(false);
    if (error) {
      setPrimaryImagesResult(`Error: ${error}`);
      return;
    }
    setPrimaryImagesResult(
      `Scanned ${data?.scanned ?? 0} products · Updated ${data?.updated ?? 0} · Skipped ${data?.skipped ?? 0} · Missing ${data?.missing ?? 0}`
    );
  };

  const syncPinterestCatalog = async () => {
    const ok = window.confirm(
      'Push all in-stock listings to Pinterest now?\n\nRequires PINTEREST_ACCESS_TOKEN on the server. Edits usually sync automatically; use this for the first import or a full refresh.'
    );
    if (!ok) return;

    setSyncingPinterest(true);
    setPinterestSyncResult(null);
    const { data, error } = await adminService.syncPinterestCatalog();
    setSyncingPinterest(false);
    if (error) {
      setPinterestSyncResult(`Error: ${error}`);
      return;
    }
    const errs = data?.errors?.length ? ` · Errors: ${data.errors.join('; ')}` : '';
    setPinterestSyncResult(
      `Pinterest: synced ${data?.synced ?? 0} · skipped ${data?.skipped ?? 0} (no image)${errs}`
    );
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
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link to="/admin/products" className="admin-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Products
            </Link>
            <button type="button" className="admin-btn-secondary" onClick={() => void load()} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        <div
          style={{
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            background: 'rgba(0,0,0,0.22)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'white' }}>Admin tools</div>
              <div className="admin-muted" style={{ marginTop: 4 }}>
                Storage primary images · Pinterest syncs when you save listings (server token required).
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="checkout-btn-primary"
                onClick={() => void setPrimaryImagesFromStorage()}
                disabled={settingPrimaryImages || loading}
                style={{ width: 220, minWidth: 220 }}
              >
                {settingPrimaryImages ? 'Setting images…' : 'Set primary images'}
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => void syncPinterestCatalog()}
                disabled={syncingPinterest || loading}
                style={{ width: 220, minWidth: 220 }}
              >
                {syncingPinterest ? 'Syncing Pinterest…' : 'Sync all to Pinterest'}
              </button>
            </div>
          </div>
        </div>

        {pinterestSyncResult && (
          <div className="checkout-alert checkout-alert--info" style={{ marginBottom: 14 }}>
            {pinterestSyncResult}
          </div>
        )}

        {primaryImagesResult && (
          <div className="checkout-alert checkout-alert--info" style={{ marginBottom: 14 }}>
            {primaryImagesResult}
          </div>
        )}

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
                  <th>Ship to</th>
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
                    <td className="admin-cell-muted" style={{ maxWidth: 200 }}>
                      <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                        {(o.shipping_name || '').trim() || '—'}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.35 }}>
                        {(() => {
                          const lines = formatShippingLines(o.shipping_address as ShippingAddressSnap | undefined);
                          if (lines.length === 0) return <span style={{ opacity: 0.7 }}>No address snapshot</span>;
                          return lines.map((ln, i) => (
                            <div key={i}>{ln}</div>
                          ));
                        })()}
                      </div>
                    </td>
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
            <div className="admin-modal" style={{ maxWidth: 560 }}>
              <h2 id="admin-edit-title" className="admin-modal-title">
                Update order
              </h2>
              <p className="admin-modal-id">{editing.orderId}</p>

              {(() => {
                const editTargetResolved = editTarget ?? orders.find((o) => o.id === editing.orderId);
                if (!editTargetResolved) return null;
                const shipLines = formatShippingLines(editTargetResolved.shipping_address as ShippingAddressSnap | undefined);
                return (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Fulfill from here</div>
                <div>
                  <strong>Name:</strong> {editTargetResolved.shipping_name?.trim() || '—'}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Ship to:</strong>
                  <div style={{ marginTop: 4, opacity: 0.92 }}>
                    {shipLines.length === 0 ? (
                      <span style={{ opacity: 0.7 }}>No address on file (older orders may be missing).</span>
                    ) : (
                      shipLines.map((ln, idx) => (
                        <div key={`ship-${idx}`}>{ln}</div>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Buyer email:</strong> {editTargetResolved.buyer_email ?? '—'}
                </div>
                {editTargetResolved.promo_code ? (
                  <div style={{ marginTop: 6 }}>
                    <strong>Promo:</strong> {editTargetResolved.promo_code}
                  </div>
                ) : null}
                <div style={{ marginTop: 10 }}>
                  <strong>Items</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {(editTargetResolved.order_items || []).map((it) => (
                      <li key={it.id}>
                        {it.name}
                        {it.size ? ` — ${it.size}` : ''} <span style={{ opacity: 0.7 }}>(#{it.product_id})</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {(editTargetResolved.square_order_id || editTargetResolved.square_payment_id) && (
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, wordBreak: 'break-all' }}>
                    {editTargetResolved.square_order_id && (
                      <div>
                        <strong>Square order:</strong> {editTargetResolved.square_order_id}
                      </div>
                    )}
                    {editTargetResolved.square_payment_id && (
                      <div style={{ marginTop: 4 }}>
                        <strong>Square payment:</strong> {editTargetResolved.square_payment_id}
                      </div>
                    )}
                  </div>
                )}
              </div>
                );
              })()}

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
                <button
                  type="button"
                  className="checkout-btn-secondary"
                  onClick={() => {
                    setEditing(null);
                    setEditTarget(null);
                  }}
                >
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
