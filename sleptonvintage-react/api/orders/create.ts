import { VercelRequest, VercelResponse } from '@vercel/node';
import { Client, Environment } from 'squareup';

// Initialize Square client
const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cartItems, customerInfo, shippingInfo } = req.body;

    // Validate required fields
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ 
        error: 'Cart items are required' 
      });
    }

    if (!customerInfo || !shippingInfo) {
      return res.status(400).json({ 
        error: 'Customer and shipping information are required' 
      });
    }

    // Validate customer info
    const requiredCustomerFields = ['firstName', 'lastName', 'email'];
    for (const field of requiredCustomerFields) {
      if (!customerInfo[field]) {
        return res.status(400).json({ 
          error: `Missing required customer field: ${field}` 
        });
      }
    }

    // Validate shipping info
    const requiredShippingFields = ['address1', 'city', 'state', 'zipCode'];
    for (const field of requiredShippingFields) {
      if (!shippingInfo[field]) {
        return res.status(400).json({ 
          error: `Missing required shipping field: ${field}` 
        });
      }
    }

    // Create order items - each item has quantity 1 (unique items)
    const orderItems = cartItems.map((cartItem: any) => {
      const product = cartItem.product;
      
      if (!product) {
        throw new Error(`Product not found for cart item ${cartItem.id}`);
      }

      return {
        name: `${product.name} - Size ${product.size}`,
        quantity: '1', // Always 1 for unique items
        itemType: 'ITEM',
        basePriceMoney: {
          amount: Math.round(product.price * 100), // Convert to cents
          currency: 'USD'
        },
        note: `Product ID: ${product.id} | Category: ${product.category}`
      };
    });

    // Calculate total amount
    const subtotal = cartItems.reduce((sum: number, cartItem: any) => {
      return sum + cartItem.product.price;
    }, 0);

    // Calculate tax (8.5% - adjust as needed)
    const taxRate = 0.085;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Create order
    const ordersApi = client.ordersApi;
    const orderRequest = {
      idempotencyKey: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems: orderItems,
        taxes: [
          {
            name: 'Sales Tax',
            percentage: (taxRate * 100).toString(), // Convert to percentage string
            scope: 'ORDER'
          }
        ],
        pricingOptions: {
          autoApplyTaxes: true,
          autoApplyDiscounts: false
        },
        fulfillment: {
          type: 'SHIPMENT',
          state: 'PROPOSED',
          shipmentDetails: {
            recipient: {
              displayName: `${customerInfo.firstName} ${customerInfo.lastName}`,
              emailAddress: customerInfo.email,
              phoneNumber: customerInfo.phone || undefined,
              address: {
                addressLine1: shippingInfo.address1,
                addressLine2: shippingInfo.address2 || undefined,
                locality: shippingInfo.city,
                administrativeDistrictLevel1: shippingInfo.state,
                postalCode: shippingInfo.zipCode,
                country: 'US'
              }
            },
            carrier: 'OTHER',
            shippingNote: shippingInfo.notes || 'Slept On Vintage order'
          }
        }
      }
    };

    const { result } = await ordersApi.createOrder(orderRequest);

    if (result.order) {
      return res.status(200).json({
        success: true,
        order: {
          id: result.order.id,
          version: result.order.version,
          locationId: result.order.locationId,
          lineItems: result.order.lineItems,
          totalMoney: result.order.totalMoney,
          state: result.order.state
        },
        totals: {
          subtotal: Math.round(subtotal * 100), // Return in cents
          tax: Math.round(taxAmount * 100),
          total: Math.round(totalAmount * 100)
        },
        customerInfo: {
          name: `${customerInfo.firstName} ${customerInfo.lastName}`,
          email: customerInfo.email
        }
      });
    } else {
      return res.status(400).json({
        error: 'Order creation failed',
        errors: result.errors
      });
    }

  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

