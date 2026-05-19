import { getSquareClient, toNumberAmount } from './squareClient';

export type RefundPaymentResult =
  | { ok: true; refundId?: string }
  | { ok: false; message: string };

/**
 * Full refund for a completed Square payment (e.g. inventory lost race at finalize_order).
 */
export async function refundSquarePayment(
  paymentId: string,
  reason: string,
): Promise<RefundPaymentResult> {
  if (!process.env.SQUARE_ACCESS_TOKEN) {
    return { ok: false, message: 'Missing SQUARE_ACCESS_TOKEN' };
  }

  try {
    const client = getSquareClient();
    const paymentResult = await client.payments.get({ paymentId });
    const payment = paymentResult.payment;
    if (!payment?.amountMoney) {
      return { ok: false, message: 'Payment not found for refund' };
    }

    const amount = toNumberAmount(payment.amountMoney.amount);
    if (amount <= 0) {
      return { ok: true };
    }

    const idempotencyKey = `rf-${paymentId}`.slice(0, 45);
    const refundResult = await client.refunds.refundPayment({
      idempotencyKey,
      paymentId,
      amountMoney: {
        amount: BigInt(amount),
        currency: (payment.amountMoney.currency as 'USD') || 'USD',
      },
      reason: reason.slice(0, 192),
    });

    if (refundResult.errors?.length) {
      const msg = refundResult.errors.map((e) => e.detail || e.code).filter(Boolean).join('; ');
      return { ok: false, message: msg || 'Square refund failed' };
    }

    return { ok: true, refundId: refundResult.refund?.id };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Square refund error',
    };
  }
}
