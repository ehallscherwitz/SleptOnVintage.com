import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { giveawayService, type GiveawayOrderNeedingShipping } from '../services/giveawayService';
import type { CustomerInfo, ShippingInfo } from '../services/checkoutService';
import { confettiBurst } from '../utils/confetti';

type Props = {
  order: GiveawayOrderNeedingShipping;
  defaultEmail?: string | null;
  onSubmitted: () => void;
};

export const GiveawayWinnerModal: React.FC<Props> = ({ order, defaultEmail, onSubmitted }) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    email: defaultEmail || '',
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    confettiBurst();
  }, [order.id]);

  useEffect(() => {
    if (defaultEmail) {
      setCustomerInfo((prev) => ({ ...prev, email: prev.email || defaultEmail }));
    }
  }, [defaultEmail]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { ok, error } = await giveawayService.submitWinnerShipping({
        orderId: order.id,
        customerInfo,
        shippingInfo,
      });
      if (!ok) {
        setErr(error || 'Could not save shipping');
        return;
      }
      onSubmitted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="giveaway-winner-overlay" role="dialog" aria-modal="true" aria-labelledby="giveaway-winner-title">
      <div className="giveaway-winner-modal">
        <h2 id="giveaway-winner-title" className="giveaway-winner-title">
          Congrats — you won!
        </h2>
        <p className="giveaway-winner-lead">
          You won <strong>{order.productName}</strong>. Enter your shipping address so we can send it out (free).
        </p>

        {err && <div className="checkout-alert checkout-alert--error">{err}</div>}

        <form className="giveaway-winner-form" onSubmit={(e) => void submit(e)}>
          <section className="checkout-section">
            <h3>Contact</h3>
            <div className="checkout-form-grid">
              <div className="checkout-form-row">
                <input
                  className="checkout-input"
                  type="text"
                  placeholder="First name *"
                  value={customerInfo.firstName}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                  autoComplete="given-name"
                  required
                />
                <input
                  className="checkout-input"
                  type="text"
                  placeholder="Last name *"
                  value={customerInfo.lastName}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                  autoComplete="family-name"
                  required
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
                  required
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
            <h3>Shipping address</h3>
            <div className="checkout-form-grid">
              <input
                className="checkout-input"
                type="text"
                placeholder="Address line 1 *"
                value={shippingInfo.address1}
                onChange={(e) => setShippingInfo({ ...shippingInfo, address1: e.target.value })}
                autoComplete="address-line1"
                required
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
                  required
                />
                <input
                  className="checkout-input"
                  type="text"
                  placeholder="State *"
                  value={shippingInfo.state}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                  autoComplete="address-level1"
                  required
                />
                <input
                  className="checkout-input"
                  type="text"
                  placeholder="ZIP *"
                  value={shippingInfo.zipCode}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                  autoComplete="postal-code"
                  required
                />
              </div>
            </div>
          </section>

          <button type="submit" className="checkout-btn-primary giveaway-winner-submit" disabled={busy}>
            {busy ? 'Saving…' : 'Submit shipping info'}
          </button>
        </form>

        <p className="giveaway-winner-foot">
          By submitting, you agree to our{' '}
          <Link to="/terms" className="checkout-link">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="checkout-link">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};
