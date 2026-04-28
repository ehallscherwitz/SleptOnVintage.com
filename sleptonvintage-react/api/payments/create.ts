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
    const { sourceId, orderId, buyerEmail, shippingAddress, billingAddress } = req.body;

    // Validate required fields
    if (!sourceId || !orderId) {
      return res.status(400).json({ 
        error: 'Missing required fields: sourceId, orderId' 
      });
    }

    // Get the order details first to get the total amount
    const ordersApi = client.ordersApi;
    const { result: orderResult } = await ordersApi.retrieveOrder(orderId);

    if (!orderResult.order || !orderResult.order.totalMoney) {
      return res.status(400).json({
        error: 'Order not found or invalid'
      });
    }

    const totalAmount = orderResult.order.totalMoney.amount;

    // Create payment
    const paymentsApi = client.paymentsApi;
    const paymentRequest = {
      sourceId: sourceId,
      amountMoney: {
        amount: totalAmount,
        currency: 'USD'
      },
      idempotencyKey: `payment-${orderId}-${Date.now()}`, // Unique key for idempotency
      orderId: orderId,
      buyerEmailAddress: buyerEmail,
      shippingAddress: shippingAddress ? {
        addressLine1: shippingAddress.address1,
        addressLine2: shippingAddress.address2 || undefined,
        locality: shippingAddress.city,
        administrativeDistrictLevel1: shippingAddress.state,
        postalCode: shippingAddress.zipCode,
        country: 'US'
      } : undefined,
      billingAddress: billingAddress ? {
        addressLine1: billingAddress.address1,
        addressLine2: billingAddress.address2 || undefined,
        locality: billingAddress.city,
        administrativeDistrictLevel1: billingAddress.state,
        postalCode: billingAddress.zipCode,
        country: 'US'
      } : undefined,
      note: `Slept On Vintage order - ${orderId}`
    };

    const { result } = await paymentsApi.createPayment(paymentRequest);

    if (result.payment) {
      return res.status(200).json({
        success: true,
        payment: {
          id: result.payment.id,
          status: result.payment.status,
          amountMoney: result.payment.amountMoney,
          orderId: result.payment.orderId,
          createdAt: result.payment.createdAt,
          updatedAt: result.payment.updatedAt
        },
        orderId: orderId
      });
    } else {
      return res.status(400).json({
        error: 'Payment creation failed',
        errors: result.errors
      });
    }

  } catch (error) {
    console.error('Payment creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

