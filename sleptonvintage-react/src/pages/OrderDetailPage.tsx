import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { PageHeadingRow } from '../components/PageHeadingRow';
import { orderService, type DbOrderItem } from '../services/orderService';
import { formatUsdFromCents } from '../utils/money';

type OrderWithItems = Awaited<ReturnType<typeof orderService.getOrderWithItems>>['data'];

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const checkoutSuccess = Boolean((location.state as { checkoutSuccess?: boolean } | null)?.checkoutSuccess);

  const [order, setOrder] = useState<OrderWithItems>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(checkoutSuccess);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!orderId) {
        setErr('Missing order id');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr(null);
      const { data, error } = await orderService.getOrderWithItems(orderId);
      if (cancelled) return;
      if (error) setErr(error.message);
      else if (!data) setErr('Order not found.');
      else setOrder(data);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const items: DbOrderItem[] = order?.order_items ?? [];
  const addr = order?.shipping_address as Record<string, string> | null;

  return (
    <div className="order-detail-page">
      <Header />
      <div className="order-detail-inner">
        <PageHeadingRow title="Order details" fallbackTo="/orders" />
        {order && (
          <p className="checkout-subtitle">
            Placed {new Date(order.created_at).toLocaleString()} ·{' '}
            <span className="order-badge">{order.status}</span>
          </p>
        )}

        {showSuccess && (
          <div className="checkout-alert checkout-alert--success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span>Thank you — your payment was received and your order is confirmed.</span>
            <button type="button" className="checkout-btn-secondary" style={{ margin: 0, width: 'auto', padding: '0.35rem 0.65rem' }} onClick={() => setShowSuccess(false)}>
              Dismiss
            </button>
          </div>
        )}

        {loading && <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading…</p>}
        {err && <div className="checkout-alert checkout-alert--error">{err}</div>}

        {order && !loading && !err && (
          <>
            <div className="order-detail-panel">
              <h2>Totals</h2>
              <div className="checkout-total-row">
                <span>Subtotal</span>
                <strong>${formatUsdFromCents(order.subtotal)}</strong>
              </div>
              <div className="checkout-total-row">
                <span>Tax</span>
                <strong>${formatUsdFromCents(order.tax)}</strong>
              </div>
              <div className="checkout-total-row">
                <span>Shipping</span>
                <strong>{order.shipping === 0 ? 'Free' : `$${formatUsdFromCents(order.shipping)}`}</strong>
              </div>
              <div className="checkout-total-grand">
                <span>Total</span>
                <span>${formatUsdFromCents(order.total)}</span>
              </div>
            </div>

            {(order.tracking_number || order.tracking_url) && (
              <div className="order-detail-panel">
                <h2>Tracking</h2>
                {order.tracking_number && (
                  <p style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.85)' }}>
                    <strong>USPS:</strong> {order.tracking_number}
                  </p>
                )}
                {order.tracking_url && (
                  <div className="order-tracking-box">
                    <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                      Track package →
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="order-detail-panel">
              <h2>Shipping</h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)' }}>{order.shipping_name ?? '—'}</p>
              {addr && (
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>
                  {[addr.address1, addr.address2].filter(Boolean).join(', ')}
                  <br />
                  {[addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}
                  {addr.notes ? (
                    <>
                      <br />
                      <span style={{ color: 'rgba(255,255,255,0.55)' }}>Delivery notes: {addr.notes}</span>
                    </>
                  ) : null}
                </p>
              )}
            </div>

            <div className="order-detail-panel">
              <h2>Items</h2>
              {items.map((it) => (
                <div key={it.id} className="order-item-row">
                  <span>
                    {it.name} <span style={{ color: 'rgba(255,255,255,0.45)' }}>({it.size})</span>
                  </span>
                  <span>${formatUsdFromCents(it.price)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
