import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { PageHeadingRow } from '../components/PageHeadingRow';
import AuthModal from '../components/AuthModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { checkoutService, getPromoResult, type CheckoutCartItem, type CustomerInfo, type ShippingInfo } from '../services/checkoutService';
import { formatUsdFromCents } from '../utils/money';
import { ProductThumbnail } from '../components/ProductThumbnail';
import { FREE_CHECKOUT_INTERVAL_DAYS, RETURN_CLAIM_DAYS } from '../constants/legal';

declare global {
  interface Window {
    Square?: any;
  }
}

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { resetCart } = useCart();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [cartItems, setCartItems] = useState<CheckoutCartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const cardRef = useRef<any>(null);
  const [pendingSquareOrder, setPendingSquareOrder] = useState<{
    id: string;
    totals?: { subtotal?: number; discount?: number; discountedSubtotal?: number; tax?: number; total?: number };
    promoCode?: string | null;
  } | null>(null);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
  });
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setCustomerInfo((prev) => ({ ...prev, email: prev.email || user.email || '' }));
    }
  }, [user?.email]);

  const totals = useMemo(
    () => checkoutService.calculateTotals(cartItems, appliedPromoCode || undefined),
    [cartItems, appliedPromoCode],
  );
  const isFreeCheckout = totals.total === 0;

  const squareConfig = useMemo(() => {
    const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID as string | undefined;
    const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID as string | undefined;
    const env = (import.meta.env.VITE_SQUARE_ENV as string | undefined)?.toLowerCase();
    const isSandbox = env ? env === 'sandbox' : Boolean(applicationId?.startsWith('sandbox-'));
    return { applicationId, locationId, isSandbox };
  }, []);

  useEffect(() => {
    const loadCartItems = async () => {
      setInitialLoad(true);
      try {
        const { data, error: loadErr } = await checkoutService.getCartItemsForCheckout();
        if (loadErr) {
          setError(loadErr.message || 'Failed to load cart items');
        } else {
          setCartItems(data);
          setPendingSquareOrder(null);
        }
      } catch (err) {
        setError('Failed to load cart items');
        console.error('Error loading cart items:', err);
      } finally {
        setInitialLoad(false);
      }
    };

    if (user) {
      void loadCartItems();
    } else {
      setInitialLoad(false);
    }
  }, [user]);

  useEffect(() => {
    if (isFreeCheckout) setPendingSquareOrder(null);
  }, [isFreeCheckout]);

  async function ensureSquareCardMounted() {
    const { applicationId, locationId, isSandbox } = squareConfig;
    if (!applicationId || !locationId) {
      throw new Error('Missing Square config. Set VITE_SQUARE_APPLICATION_ID and VITE_SQUARE_LOCATION_ID in .env.local and restart dev server.');
    }

    if (cardRef.current) return;

    if (!window.Square) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = isSandbox
          ? 'https://sandbox.web.squarecdn.com/v1/square.js'
          : 'https://web.squarecdn.com/v1/square.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Square Web Payments SDK.'));
        document.head.appendChild(script);
      });
    }

    const container = document.querySelector('#card-container');
    if (!container) {
      throw new Error('CARD_CONTAINER_NOT_READY');
    }

    const payments = await window.Square.payments(applicationId, locationId);
    const card = await payments.card();
    await card.attach('#card-container');
    cardRef.current = card;
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!user || initialLoad || cartItems.length === 0) return;
      if (isFreeCheckout) {
        setPaymentReady(true);
        setPaymentStatus('ready');
        return;
      }
      try {
        setPaymentStatus('loading');
        // Let the card container render in the current frame first.
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await ensureSquareCardMounted();
        if (!cancelled) {
          setPaymentReady(true);
          setPaymentStatus('ready');
        }
      } catch (e: any) {
        if (!cancelled) {
          setPaymentReady(false);
          setPaymentStatus('unavailable');
          console.error('Square card mount failed:', e);
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initialLoad, cartItems.length, isFreeCheckout]);

  const handlePayNow = async () => {
    if (cartItems.length === 0) {
      setError('No items in cart');
      return;
    }

    const requiredFields = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode'];
    const missingFields = requiredFields.filter((field) => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return !customerInfo[parent as keyof CustomerInfo] && !shippingInfo[child as keyof ShippingInfo];
      }
      return !customerInfo[field as keyof CustomerInfo] && !shippingInfo[field as keyof ShippingInfo];
    });

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to place your order.');
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentStatus('idle');

    try {
      const finishFreeCheckout = async () => {
        const { data: freeData, error: freeErr } = await checkoutService.finalizeFreeOrder(
          customerInfo,
          shippingInfo,
          appliedPromoCode || undefined,
        );
        if (freeErr) throw new Error((freeErr as { message?: string }).message || 'Order failed');
        const supabaseOrderId = freeData?.supabaseOrderId as string | undefined;
        await resetCart();
        setCartItems([]);
        if (supabaseOrderId) {
          navigate(`/orders/${supabaseOrderId}`, { state: { checkoutSuccess: true } });
        } else {
          navigate('/orders', { state: { checkoutSuccess: true } });
        }
      };

      // Use freshly computed totals (not only isFreeCheckout) — Supabase bigint prices can be strings
      // which used to yield NaN / wrong totals so we'd incorrectly hit Square tokenize().
      const payTotals = checkoutService.calculateTotals(cartItems, appliedPromoCode || undefined);
      if (payTotals.total === 0) {
        await finishFreeCheckout();
        return;
      }

      await ensureSquareCardMounted();

      // Step 1: create the Square order so we can show the exact total Square will charge.
      if (!pendingSquareOrder) {
        const { data: orderData, error: orderErr } = await checkoutService.createOrder(
          cartItems,
          customerInfo,
          shippingInfo,
          appliedPromoCode || undefined
        );
        if (orderErr) throw new Error(orderErr.message || 'Failed to create order');

        const squareOrderId = orderData?.order?.id as string | undefined;
        if (!squareOrderId) throw new Error('Square order ID missing from response.');

        setPendingSquareOrder({
          id: squareOrderId,
          totals: orderData?.totals,
          promoCode: orderData?.promo?.code ?? appliedPromoCode ?? null,
        });
        setLoading(false);
        return;
      }

      const totalsBeforePay = checkoutService.calculateTotals(cartItems, appliedPromoCode || undefined);
      if (totalsBeforePay.total === 0) {
        setPendingSquareOrder(null);
        await finishFreeCheckout();
        return;
      }

      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== 'OK') {
        throw new Error(tokenResult.errors?.[0]?.message || 'Card tokenize failed.');
      }

      const sourceId = tokenResult.token;
      const { data: payData, error: payErr } = await checkoutService.processPayment(
        sourceId,
        pendingSquareOrder.id,
        customerInfo.email,
        shippingInfo,
        shippingInfo,
        customerInfo,
        pendingSquareOrder.promoCode ?? undefined
      );
      if (payErr) throw new Error(payErr.message || 'Payment failed');

      const supabaseOrderId = payData?.supabaseOrderId as string | undefined;
      await resetCart();
      setCartItems([]);

      if (supabaseOrderId) {
        navigate(`/orders/${supabaseOrderId}`, { state: { checkoutSuccess: true } });
      } else {
        navigate('/orders', { state: { checkoutSuccess: true } });
      }
    } catch (err: any) {
      setError(err?.message || 'Checkout failed');
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestOrder = async () => {
    if (cartItems.length === 0) {
      setError('No items in cart');
      return;
    }

    const requiredFields = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode'];
    const missingFields = requiredFields.filter((field) => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return !customerInfo[parent as keyof CustomerInfo] && !shippingInfo[child as keyof ShippingInfo];
      }
      return !customerInfo[field as keyof CustomerInfo] && !shippingInfo[field as keyof ShippingInfo];
    });

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to place your order.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: createErr } = await checkoutService.createOrder(
        cartItems,
        customerInfo,
        shippingInfo,
        appliedPromoCode || undefined
      );

      if (createErr) {
        setError(createErr.message || 'Failed to create order');
      } else {
        alert(`Square order created (no payment). ID: ${data.order.id}`);
        await resetCart();
        setCartItems([]);
      }
    } catch (err) {
      setError('Failed to create order');
      console.error('Order creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const displayTotals = pendingSquareOrder?.totals?.total != null ? pendingSquareOrder.totals : totals;

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setAppliedPromoCode(null);
      setPromoMessage(null);
      setPendingSquareOrder(null);
      return;
    }
    const promo = getPromoResult(code);
    if (promo.applied && promo.code) {
      setAppliedPromoCode(promo.code);
      setPromoMessage(`Promo applied: ${promo.code} (10% off).`);
      setPendingSquareOrder(null);
    } else {
      setAppliedPromoCode(null);
      setPromoMessage('Invalid promo code.');
      setPendingSquareOrder(null);
    }
  };

  if (!user) {
    return (
      <div className="checkout-shell">
        <Header />
        <div className="checkout-inner checkout-empty">
          <PageHeadingRow title="Checkout" />
          <p>Please sign in to complete your purchase.</p>
          <button type="button" className="checkout-btn-primary" onClick={() => setShowAuthModal(true)}>
            Sign in
          </button>
          <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
      </div>
    );
  }

  if (initialLoad) {
    return (
      <div className="checkout-shell">
        <Header />
        <div className="checkout-inner">
          <PageHeadingRow title="Checkout" />
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading your cart…</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-shell">
        <Header />
        <div className="checkout-inner checkout-empty">
          <PageHeadingRow title="Checkout" />
          <p>Your cart is empty.</p>
          <p>
            <Link to="/" className="checkout-link">
              Browse products
            </Link>
            {' · '}
            <Link to="/cart" className="checkout-link">
              View cart
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-shell">
      <Header />
      <div className="checkout-inner">
        <PageHeadingRow title="Checkout" />
        <p className="checkout-subtitle">
          {isFreeCheckout
            ? 'Review your order and shipping details — no payment required for $0 orders.'
            : 'Review your order, enter shipping details, and pay securely.'}
        </p>

        {error && <div className="checkout-alert checkout-alert--error">{error}</div>}
        {!isFreeCheckout && !paymentReady && paymentStatus === 'unavailable' && (
          <div className="checkout-alert checkout-alert--info">
            Payment form is temporarily unavailable. Please refresh and try again.
          </div>
        )}

        <div className="checkout-layout">
          <div className="checkout-main">
            <section className="checkout-section">
              <h2>Contact</h2>
              <div className="checkout-form-grid">
                <div className="checkout-form-row">
                  <input
                    className="checkout-input"
                    type="text"
                    placeholder="First name *"
                    value={customerInfo.firstName}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                    autoComplete="given-name"
                  />
                  <input
                    className="checkout-input"
                    type="text"
                    placeholder="Last name *"
                    value={customerInfo.lastName}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                    autoComplete="family-name"
                  />
                </div>
                <div className="checkout-form-row">
                  <input
                    className="checkout-input"
                    type="email"
                    placeholder="Email *"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    autoComplete="email"
                  />
                  <input
                    className="checkout-input"
                    type="tel"
                    placeholder="Phone (optional)"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </section>

            <section className="checkout-section">
              <h2>Shipping address</h2>
              <div className="checkout-form-grid">
                <input
                  className="checkout-input"
                  type="text"
                  placeholder="Address line 1 *"
                  value={shippingInfo.address1}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, address1: e.target.value })}
                  autoComplete="address-line1"
                />
                <input
                  className="checkout-input"
                  type="text"
                  placeholder="Address line 2 (optional)"
                  value={shippingInfo.address2}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, address2: e.target.value })}
                  autoComplete="address-line2"
                />
                <div className="checkout-form-row-3">
                  <input
                    className="checkout-input"
                    type="text"
                    placeholder="City *"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                    autoComplete="address-level2"
                  />
                  <input
                    className="checkout-input"
                    type="text"
                    placeholder="State *"
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                    autoComplete="address-level1"
                  />
                  <input
                    className="checkout-input"
                    type="text"
                    placeholder="ZIP *"
                    value={shippingInfo.zipCode}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                    autoComplete="postal-code"
                  />
                </div>
              </div>
            </section>

            <section className="checkout-section">
              <h2>Promo code</h2>
              <div className="checkout-promo-row">
                <input
                  className="checkout-input checkout-promo-input"
                  type="text"
                  placeholder="Enter promo code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                />
                <button type="button" className="checkout-btn-secondary checkout-promo-btn" onClick={applyPromo}>
                  Apply
                </button>
              </div>
              {promoMessage && (
                <p className="checkout-hint" style={{ color: totals.promo.applied ? '#9ef6a7' : '#ffb4bd' }}>
                  {promoMessage}
                </p>
              )}
            </section>

            <section className="checkout-section">
              <h2>{isFreeCheckout ? 'Complete order' : 'Payment'}</h2>
              {isFreeCheckout ? (
                <p className="checkout-hint">
                  This order total is $0.00 — no card required. Click below to confirm shipping details and place your order.
                  {' '}
                  Limit one complimentary checkout per account every {FREE_CHECKOUT_INTERVAL_DAYS} days (only one $0
                  listing in the cart at a time).
                </p>
              ) : (
                <>
                  <p className="checkout-hint">Card details are collected securely by Square.</p>
                  <div id="card-container" className="checkout-card-frame" />
                </>
              )}
              <label className="checkout-legal-row">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span className="checkout-legal-label">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </Link>{' '}
                  (all sales final; {RETURN_CLAIM_DAYS}-day exceptions for transit damage or wrong item) and{' '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              <button
                type="button"
                className="checkout-btn-primary"
                onClick={() => void handlePayNow()}
                disabled={loading || !agreedToTerms || (!isFreeCheckout && !paymentReady)}
              >
                {loading
                  ? 'Processing…'
                  : isFreeCheckout
                    ? 'Place order'
                    : pendingSquareOrder
                      ? `Confirm & Pay $${formatUsdFromCents(displayTotals.total ?? totals.total)}`
                      : 'Review total (Square)'}
              </button>
              {!isFreeCheckout && pendingSquareOrder && (
                <p className="checkout-hint" style={{ marginTop: 10 }}>
                  Total above is pulled from Square’s order calculation. Clicking “Confirm” will charge that exact amount.
                </p>
              )}
              {import.meta.env.DEV && (
                <>
                  <button type="button" className="checkout-btn-secondary" onClick={() => void handleTestOrder()} disabled={loading}>
                    Dev: create Square order only (no charge)
                  </button>
                  <p className="checkout-hint">Shown only in development builds.</p>
                </>
              )}
            </section>
          </div>

          <aside className="checkout-aside">
            <div className="checkout-summary-card">
              <h2>Order summary</h2>
              {cartItems.map((item) => (
                <div key={item.id} className="checkout-line-item">
                  <ProductThumbnail product={item.product} className="checkout-line-thumb" alt="" />
                  <div className="checkout-line-meta">
                    <p className="checkout-line-name">{item.product.name}</p>
                    <p className="checkout-line-detail">
                      Size {item.product.size}
                    </p>
                  </div>
                  <div className="checkout-line-price">${formatUsdFromCents(item.product.price)}</div>
                </div>
              ))}
              <div className="checkout-totals">
                <div className="checkout-total-row">
                  <span>Subtotal</span>
                  <strong>${formatUsdFromCents(displayTotals.subtotal ?? totals.subtotal)}</strong>
                </div>
                {(displayTotals.discount ?? totals.discount) > 0 && (
                  <div className="checkout-total-row">
                    <span>Promo ({pendingSquareOrder?.promoCode ?? totals.promo.code})</span>
                    <strong>- ${formatUsdFromCents(displayTotals.discount ?? totals.discount)}</strong>
                  </div>
                )}
                <div className="checkout-total-row">
                  <span>{pendingSquareOrder ? 'Tax' : 'Estimated tax'}</span>
                  <strong>${formatUsdFromCents(displayTotals.tax ?? totals.tax)}</strong>
                </div>
                <div className="checkout-total-row">
                  <span>Shipping</span>
                  <strong>Free</strong>
                </div>
                <div className="checkout-total-grand">
                  <span>Total</span>
                  <span>${formatUsdFromCents(displayTotals.total ?? totals.total)}</span>
                </div>
              </div>
              <p className="checkout-shipping-note">USPS tracking will appear on your order once the item ships.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
