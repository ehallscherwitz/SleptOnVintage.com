import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { checkoutService, type CheckoutCartItem, type CustomerInfo, type ShippingInfo } from '../services/checkoutService';

export const CheckoutPage: React.FC = () => {
  const { cart, resetCart } = useCart();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CheckoutCartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: ''
  });
  
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    notes: ''
  });

  // Load cart items for checkout
  useEffect(() => {
    const loadCartItems = async () => {
      setLoading(true);
      try {
        const { data, error } = await checkoutService.getCartItemsForCheckout();
        if (error) {
          setError(error.message || 'Failed to load cart items');
        } else {
          setCartItems(data);
        }
      } catch (err) {
        setError('Failed to load cart items');
        console.error('Error loading cart items:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadCartItems();
    }
  }, [user]);

  const handleTestOrder = async () => {
    if (cartItems.length === 0) {
      setError('No items in cart');
      return;
    }

    // Validate form
    const requiredFields = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode'];
    const missingFields = requiredFields.filter(field => {
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

    setLoading(true);
    setError(null);

    try {
      console.log('Creating order with:', { cartItems, customerInfo, shippingInfo });
      
      const { data, error } = await checkoutService.createOrder(cartItems, customerInfo, shippingInfo);
      
      if (error) {
        setError(error.message || 'Failed to create order');
      } else {
        console.log('✅ Order created successfully:', data);
        alert(`Order created successfully! Order ID: ${data.order.id}`);
        // Clear cart after successful order
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

  const totals = checkoutService.calculateTotals(cartItems);

  if (!user) {
    return (
      <div className="checkout-page">
        <h1>Checkout</h1>
        <p>Please sign in to proceed with checkout.</p>
      </div>
    );
  }

  if (loading && cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <h1>Checkout</h1>
        <p>Loading cart items...</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <h1>Checkout</h1>
        <p>Your cart is empty. Add some items to your cart before checking out.</p>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      
      {/* Cart Summary */}
      <div className="cart-summary">
        <h2>Order Summary</h2>
        {cartItems.map((item) => (
          <div key={item.id} className="cart-item">
            <div className="item-details">
              <h4>{item.product.name}</h4>
              <p>Size: {item.product.size} | ${item.product.price}</p>
            </div>
          </div>
        ))}
        <div className="totals">
          <div className="total-line">
            <span>Subtotal:</span>
            <span>${totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="total-line">
            <span>Tax (8.5%):</span>
            <span>${totals.tax.toFixed(2)}</span>
          </div>
          <div className="total-line total">
            <span>Total:</span>
            <span>${totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="customer-info">
        <h2>Customer Information</h2>
        <div className="form-row">
          <input
            type="text"
            placeholder="First Name *"
            value={customerInfo.firstName}
            onChange={(e) => setCustomerInfo({...customerInfo, firstName: e.target.value})}
          />
          <input
            type="text"
            placeholder="Last Name *"
            value={customerInfo.lastName}
            onChange={(e) => setCustomerInfo({...customerInfo, lastName: e.target.value})}
          />
        </div>
        <div className="form-row">
          <input
            type="email"
            placeholder="Email *"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
          />
        </div>
      </div>

      {/* Shipping Information */}
      <div className="shipping-info">
        <h2>Shipping Information</h2>
        <input
          type="text"
          placeholder="Address Line 1 *"
          value={shippingInfo.address1}
          onChange={(e) => setShippingInfo({...shippingInfo, address1: e.target.value})}
        />
        <input
          type="text"
          placeholder="Address Line 2"
          value={shippingInfo.address2}
          onChange={(e) => setShippingInfo({...shippingInfo, address2: e.target.value})}
        />
        <div className="form-row">
          <input
            type="text"
            placeholder="City *"
            value={shippingInfo.city}
            onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
          />
          <input
            type="text"
            placeholder="State *"
            value={shippingInfo.state}
            onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
          />
          <input
            type="text"
            placeholder="ZIP Code *"
            value={shippingInfo.zipCode}
            onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
          />
        </div>
        <textarea
          placeholder="Shipping Notes (Optional)"
          value={shippingInfo.notes}
          onChange={(e) => setShippingInfo({...shippingInfo, notes: e.target.value})}
          rows={3}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Test Order Button */}
      <div className="checkout-actions">
        <button 
          onClick={handleTestOrder}
          disabled={loading}
          className="test-order-button"
        >
          {loading ? 'Creating Order...' : 'Test Order Creation (No Payment)'}
        </button>
        <p className="test-note">
          This will create an order in Square without processing payment. 
          Perfect for testing the API integration!
        </p>
      </div>
    </div>
  );
};

export default CheckoutPage;

