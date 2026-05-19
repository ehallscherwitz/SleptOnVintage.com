import { SquareClient, SquareEnvironment } from 'square';

export function getSquareEnvironment() {
  const env = (process.env.SQUARE_ENV || '').toLowerCase();
  if (env === 'sandbox') return SquareEnvironment.Sandbox;
  if (env === 'production') return SquareEnvironment.Production;
  return process.env.NODE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox;
}

export function getSquareClient() {
  return new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN!,
    environment: getSquareEnvironment(),
  });
}

export function toNumberAmount(v: unknown): number {
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}
