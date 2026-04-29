import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { orderService, type DbOrder } from '../services/orderService';
import { formatUsdFromCents } from '../utils/money';

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr(null);
      const { data, error } = await orderService.listMyOrders();
      if (cancelled) return;
      if (error) setErr(error.message);
      else setOrders(data);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="orders-page">
        <Header />
        <div className="orders-inner">
          <h1 className="checkout-title">My orders</h1>
          <p className="checkout-subtitle">Sign in to view your orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <Header />
      <div className="orders-inner">
        <h1 className="checkout-title">My orders</h1>
        <p className="checkout-subtitle">Track shipments and view order details.</p>

        {loading && <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading…</p>}
        {err && <div className="checkout-alert checkout-alert--error">{err}</div>}

        {!loading && !err && orders.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.65)' }}>You have not placed any orders yet.</p>
        )}

        <div className="orders-list">
          {orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="order-card">
              <div className="order-card-top">
                <div>
                  <span className="order-badge">{o.status}</span>
                  <div className="order-card-id" style={{ marginTop: 6 }}>
                    Order #{o.id.slice(0, 8)}…
                  </div>
                </div>
                <div className="order-card-amount">${formatUsdFromCents(o.total)}</div>
              </div>
              <div className="order-card-meta">
                {new Date(o.created_at).toLocaleString()} · {o.buyer_email ?? '—'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
