const STORAGE_PREFIX = 'sov_giveaway_reveal_seen_';

export const GIVEAWAY_REVEAL_COMPLETE = 'sov-giveaway-reveal-complete';

export function hasSeenGiveawayReveal(giveawayId: string): boolean {
  try {
    return sessionStorage.getItem(STORAGE_PREFIX + giveawayId) === '1';
  } catch {
    return false;
  }
}

export function clearGiveawayRevealSeen(giveawayId: string): void {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + giveawayId);
  } catch {
    /* ignore */
  }
}

export function markGiveawayRevealSeen(giveawayId: string): void {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + giveawayId, '1');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(GIVEAWAY_REVEAL_COMPLETE, { detail: { giveawayId } })
  );
}
