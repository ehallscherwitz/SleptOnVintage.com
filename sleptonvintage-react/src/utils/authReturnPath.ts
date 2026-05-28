const AUTH_RETURN_KEY = 'sov_auth_return_to';

/** Safe internal path only (prevents open redirects). */
export function sanitizeAuthReturnPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
  if (trimmed.startsWith('/auth/callback')) return '/';
  return trimmed;
}

export function currentAuthReturnPath(): string {
  return sanitizeAuthReturnPath(`${window.location.pathname}${window.location.search}`);
}

export function setAuthReturnPath(path: string): void {
  try {
    sessionStorage.setItem(AUTH_RETURN_KEY, sanitizeAuthReturnPath(path));
  } catch {
    /* ignore */
  }
}

export function consumeAuthReturnPath(): string {
  try {
    const stored = sessionStorage.getItem(AUTH_RETURN_KEY);
    sessionStorage.removeItem(AUTH_RETURN_KEY);
    if (stored) return sanitizeAuthReturnPath(stored);
  } catch {
    /* ignore */
  }
  return '/';
}
