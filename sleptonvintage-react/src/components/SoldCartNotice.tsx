import React from 'react';
import type { PrunedSoldCartItem } from '../services/cartService';

type SoldCartNoticeProps = {
  items: PrunedSoldCartItem[];
  onDismiss?: () => void;
};

export const SoldCartNotice: React.FC<SoldCartNoticeProps> = ({ items, onDismiss }) => {
  if (items.length === 0) return null;

  const label =
    items.length === 1
      ? `"${items[0].name}" was just sold and removed from your cart.`
      : `${items.length} items were just sold and removed from your cart: ${items.map((i) => i.name).join(', ')}.`;

  return (
    <div className="cart-sold-notice" role="status">
      <p className="cart-sold-notice-text">{label}</p>
      {onDismiss && (
        <button type="button" className="cart-sold-notice-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
};
