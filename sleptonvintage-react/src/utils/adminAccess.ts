/** Matches `VITE_ADMIN_EMAILS` used in the header. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
