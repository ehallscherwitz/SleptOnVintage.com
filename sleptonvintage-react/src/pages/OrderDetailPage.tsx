import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { PageHeadingRow } from '../components/PageHeadingRow';
import { orderService, type DbOrderItem } from '../services/orderService';
import { formatUsdFromCents } from '../utils/money';
import { getProductGalleryPublicUrls, getPublicProductImageUrlFromPath } from '../services/productService';

type OrderWithItems = Awaited<ReturnType<typeof orderService.getOrderWithItems>>['data'];

function resolveOrderItemImageUrl(raw: string | null | undefined): string {
  const s = (raw || '').trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('products/') || s.startsWith('items/')) return getPublicProductImageUrlFromPath(s);
  return s;
}

function guessStoragePrefixFromImagePath(raw: string | null | undefined): string | null {
  const s = (raw || '').trim();
  if (!s.startsWith('products/')) return null;
  const parts = s.split('/');
  return parts.length >= 2 ? parts[1] : null;
}

/** Prefer saved URL; otherwise default USPS tools link when we have a tracking number. */
function resolveTrackingHref(order: {
  tracking_url?: string | null;
  tracking_number?: string | null;
  carrier?: string | null;
}): string | null {
  const url = (order.tracking_url || '').trim();
  if (url) return url;
  const num = (order.tracking_number || '').trim();
  if (!num) return null;
  const carrier = (order.carrier || 'usps').trim().toLowerCase();
  if (carrier === 'usps' || carrier === '') {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(num)}`;
  }
  return null;
}

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const checkoutSuccess = Boolean((location.state as { checkoutSuccess?: boolean } | null)?.checkoutSuccess);

  const [order, setOrder] = useState<OrderWithItems>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(checkoutSuccess);
  const [activeItem, setActiveItem] = useState<DbOrderItem | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [galleryLoading, setGalleryLoading] = useState(false);

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
  const isGalleryOpen = Boolean(activeItem);

  useEffect(() => {
    let cancelled = false;
    async function loadGallery() {
      if (!activeItem) return;
      setGalleryLoading(true);
      setGalleryUrls([]);
      setGalleryIdx(0);

      const guessedPrefix = guessStoragePrefixFromImagePath(activeItem.image);
      const urls =
        (await getProductGalleryPublicUrls({
          id: activeItem.product_id,
          storage_prefix: guessedPrefix,
        })) || [];

      const fallback = resolveOrderItemImageUrl(activeItem.image);
      const finalUrls = urls.length > 0 ? urls : fallback ? [fallback] : [];

      if (!cancelled) {
        setGalleryUrls(finalUrls);
        setGalleryIdx(0);
        setGalleryLoading(false);
      }
    }
    void loadGallery();
    return () => {
      cancelled = true;
    };
  }, [activeItem]);

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
              {typeof (order as any).discount === 'number' && (order as any).discount > 0 && (
                <div className="checkout-total-row">
                  <span>Promo{(order as any).promo_code ? ` (${(order as any).promo_code})` : ''}</span>
                  <strong>- ${formatUsdFromCents((order as any).discount)}</strong>
                </div>
              )}
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

            <div className="order-detail-panel">
              <h2>Tracking</h2>
              {(() => {
                const trackHref = resolveTrackingHref(order);
                const num = (order.tracking_number || '').trim();
                if (trackHref) {
                  return (
                    <div className="order-tracking-box">
                      {num ? (
                        <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.85)' }}>
                          <strong>Tracking #:</strong> {num}
                        </p>
                      ) : null}
                      <a href={trackHref} target="_blank" rel="noopener noreferrer">
                        Track package →
                      </a>
                    </div>
                  );
                }
                if (num) {
                  return (
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)' }}>
                      Tracking #: {num}
                      <br />
                      <span style={{ fontSize: '0.9rem', opacity: 0.85 }}>
                        No carrier link on file — contact us if you need a tracking URL.
                      </span>
                    </p>
                  );
                }
                return (
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)' }}>
                    Tracking number will be provided soon.
                  </p>
                );
              })()}
            </div>

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
                <div
                  key={it.id}
                  className="order-item-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveItem(it)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setActiveItem(it);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    {resolveOrderItemImageUrl(it.image) ? (
                      <img
                        src={resolveOrderItemImageUrl(it.image)}
                        alt={it.name}
                        style={{
                          width: 56,
                          height: 56,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.15)',
                          flexShrink: 0,
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {it.name}{' '}
                        <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                          ({it.size})
                        </span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>
                        ${formatUsdFromCents(it.price)}
                      </div>
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>${formatUsdFromCents(it.price)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isGalleryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Item photos"
          onClick={() => setActiveItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              background: 'rgba(10,10,10,0.96)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeItem?.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>
                  Click outside to close
                </div>
              </div>
              <button
                type="button"
                className="checkout-btn-secondary"
                style={{ margin: 0, width: 'auto', padding: '0.35rem 0.65rem' }}
                onClick={() => setActiveItem(null)}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 14 }}>
              {galleryLoading ? (
                <div style={{ color: 'rgba(255,255,255,0.65)' }}>Loading photos…</div>
              ) : galleryUrls.length > 0 ? (
                <div className="product-gallery" style={{ margin: 0 }}>
                  <div className="product-gallery-main" style={{ position: 'relative' }}>
                    <img
                      className="product-detail-image"
                      src={galleryUrls[galleryIdx]}
                      alt={`${activeItem?.name ?? 'Item'} — photo ${galleryIdx + 1}`}
                      style={{ maxHeight: '72vh', width: '100%', objectFit: 'contain', background: 'rgba(255,255,255,0.02)' }}
                    />
                    {galleryUrls.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="product-gallery-nav product-gallery-prev"
                          aria-label="Previous photo"
                          onClick={() => setGalleryIdx((i) => (i === 0 ? galleryUrls.length - 1 : i - 1))}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="product-gallery-nav product-gallery-next"
                          aria-label="Next photo"
                          onClick={() => setGalleryIdx((i) => (i >= galleryUrls.length - 1 ? 0 : i + 1))}
                        >
                          ›
                        </button>
                        <span className="product-gallery-counter">
                          {galleryIdx + 1} / {galleryUrls.length}
                        </span>
                      </>
                    )}
                  </div>
                  {galleryUrls.length > 1 && (
                    <div className="product-gallery-thumbs" role="tablist" aria-label="Item photos">
                      {galleryUrls.map((url, idx) => (
                        <button
                          key={`${idx}-${url}`}
                          type="button"
                          role="tab"
                          aria-selected={idx === galleryIdx}
                          className={`product-gallery-thumb ${idx === galleryIdx ? 'active' : ''}`}
                          onClick={() => setGalleryIdx(idx)}
                        >
                          <img src={url} alt="" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.65)' }}>No photos available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
