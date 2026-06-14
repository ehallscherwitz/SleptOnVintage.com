/** Business and legal contact — used across policies, footer, and checkout. */
export const SITE_NAME = 'Slept On Vintage';
export const SITE_DOMAIN = 'sleptonvintage.com';
/** Trade name for the individually operated store (not a registered LLC). */
export const LEGAL_OPERATOR_NAME = 'Slept On Vintage';
export const CONTACT_EMAIL = 'sleptonvintage@gmail.com';
export const INSTAGRAM_URL = 'https://www.instagram.com/slept.on.vintage/';
export const POLICY_EFFECTIVE_DATE = 'May 19, 2026';
export const GOVERNING_LAW_STATE = 'Texas';
/** Days after delivery to request a refund under the exceptions in our refund policy. */
export const RETURN_CLAIM_DAYS = 7;
/** Rolling window for complimentary ($0) checkout per account. */
export const FREE_CHECKOUT_INTERVAL_DAYS = 14;

export function governingLawPhrase(): string {
  const state = GOVERNING_LAW_STATE.trim();
  if (state) return `the laws of the State of ${state}, United States`;
  return 'the laws of the United States';
}

export function governingVenuePhrase(): string {
  const state = GOVERNING_LAW_STATE.trim();
  if (state) return `the state and federal courts located in ${state}, United States`;
  return 'the courts located in the United States';
}
