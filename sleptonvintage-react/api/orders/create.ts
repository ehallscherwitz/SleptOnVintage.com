import { VercelRequest, VercelResponse } from '@vercel/node';
import { SquareClient, SquareEnvironment } from 'square';

function getSquareEnvironment() {
  const env = (process.env.SQUARE_ENV || '').toLowerCase();
  if (env === 'sandbox') return SquareEnvironment.Sandbox;
  if (env === 'production') return SquareEnvironment.Production;
  return process.env.NODE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox;
}

function getSquareClient() {
  // Construct client at request-time so missing/invalid env vars don't crash the function at import time.
  return new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN!,
    environment: getSquareEnvironment(),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Missing SQUARE_ACCESS_TOKEN env var on server.' });
    }
    if (!process.env.SQUARE_LOCATION_ID) {
      return res.status(500).json({ error: 'Missing SQUARE_LOCATION_ID env var on server.' });
    }

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
        basePriceMoney: {
          amount: BigInt(product.price), // already cents
          currency: 'USD' as const
        },
        note: `Product ID: ${product.id} | Category: ${product.category}`
      };
    });

    // Calculate total amount
    const subtotal = cartItems.reduce((sum: number, cartItem: any) => sum + cartItem.product.price, 0);

    // Calculate tax (8.5% - adjust as needed)
    const taxRate = 0.085;
    const taxAmount = Math.round(subtotal * taxRate);
    const totalAmount = subtotal + taxAmount;

    // Create order
    const client = getSquareClient();
    const ordersApi = client.orders;
    const orderRequest = {
      idempotencyKey: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems: orderItems,
        taxes: [
          {
            name: 'Sales Tax',
            percentage: (taxRate * 100).toString(), // Convert to percentage string
            scope: 'ORDER' as const
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
                country: 'US' as const
              }
            },
            carrier: 'OTHER',
            shippingNote: shippingInfo.notes || 'Slept On Vintage order'
          }
        }
      }
    };

    const result = await ordersApi.create(orderRequest);

    if (result?.order) {
      return res.status(200).json({
        success: true,
        order: {
          id: result.order.id,
          version: result.order.version,
          locationId: result.order.locationId,
          state: result.order.state
        },
        totals: {
          subtotal,
          tax: taxAmount,
          total: totalAmount
        },
        customerInfo: {
          name: `${customerInfo.firstName} ${customerInfo.lastName}`,
          email: customerInfo.email
        }
      });
    } else {
      return res.status(400).json({
        error: 'Order creation failed',
        errors: result?.errors
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

