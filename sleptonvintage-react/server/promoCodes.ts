/** Promo codes validated on the server at checkout (keep in sync with checkoutService). */

const TEN_PERCENT_CODES = new Set([
  'SOV',
  'EMEKA',
  'PRABHAS',
  'DIEGO',
  'GINA',
  'ISHANI',
  'SAUMYA',
  'RYAN',
  'JULIAN',
  'EISA',
  'JACOB',
  'SCOT',
  'UTD',
  'PEDXING',
]);

const CUSTOM_RATES: Record<string, number> = {
  YOGURT: 0.15,
  NOOR: 0.2,
};

export function normalizePromoCode(raw?: string | null): string {
  return (raw || '').trim().toUpperCase();
}

export function getPromoDiscountRate(raw?: string | null): { code: string; rate: number } | null {
  const code = normalizePromoCode(raw);
  if (!code) return null;
  if (Object.prototype.hasOwnProperty.call(CUSTOM_RATES, code)) {
    return { code, rate: CUSTOM_RATES[code]! };
  }
  if (TEN_PERCENT_CODES.has(code)) return { code, rate: 0.1 };
  return null;
}
