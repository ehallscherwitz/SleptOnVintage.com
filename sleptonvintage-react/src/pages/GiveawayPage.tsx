import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import { PageHeadingRow } from '../components/PageHeadingRow';
import { Seo } from '../components/Seo';
import { SITE_NAME } from '../constants/legal';
import { giveawayService, type GiveawayEntry } from '../services/giveawayService';
import { GiveawayWheel } from '../components/GiveawayWheel';
import { getPrimaryProductImageUrl, type Product } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { isAdminEmail } from '../utils/adminAccess';
import { confettiBurst } from '../utils/confetti';
import { clearGiveawayRevealSeen, markGiveawayRevealSeen } from '../utils/giveawayReveal';
import {
  armRevealSpinAudio,
  isGiveawayAudioUnlocked,
  preloadGiveawayAudio,
  resetGiveawayAudioForGiveaway,
  startGiveawayAmbience,
  stopGiveawayAmbience,
  unlockGiveawayAudio,
} from '../utils/giveawaySounds';

function nowMs(): number {
  return Date.now();
}

function fmtTimeLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / (24 * 3600));
  const hours = Math.floor((s % (24 * 3600)) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

const GiveawayPage: React.FC = () => {
  const { user, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [giveaway, setGiveaway] = useState<any | null>(null);
  const [entries, setEntries] = useState<GiveawayEntry[]>([]);
  const [entered, setEntered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [removingEntryId, setRemovingEntryId] = useState<string | null>(null);

  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  /** User has seen the reveal spin for this visit (or it finished). */
  const [replayDismissed, setReplayDismissed] = useState(false);
  const [resolving, setResolving] = useState(false);

  const winnerId = useMemo(() => {
    if (!giveaway?.winner_email && !giveaway?.winner_name) return null;
    const match = entries.find(
      (e) =>
        (giveaway.winner_email && e.email === giveaway.winner_email) ||
        (giveaway.winner_name && e.full_name === giveaway.winner_name)
    );
    return match?.id ?? null;
  }, [giveaway, entries]);

  const hasEnded = Boolean(giveaway?.ends_at && timeLeftMs <= 0);

  const replayWindowOver = useMemo(() => {
    if (!giveaway?.ends_at) return true;
    return nowMs() > new Date(giveaway.ends_at).getTime() + 24 * 60 * 60 * 1000;
  }, [giveaway]);

  const productLike: Product | null = useMemo(() => {
    if (!giveaway) return null;
    return {
      id: giveaway.product_id,
      name: giveaway.product_name,
      size: giveaway.product_size,
      price: giveaway.product_price,
      category: giveaway.product_category,
      available: giveaway.product_available,
      image: giveaway.product_image,
      updated_at: giveaway.product_updated_at ?? undefined,
      storage_prefix: giveaway.product_storage_prefix ?? undefined,
    } as Product;
  }, [giveaway]);

  const productImg = useMemo(() => {
    if (!productLike) return '';
    return getPrimaryProductImageUrl(productLike);
  }, [productLike]);

  const pollTimerRef = useRef<number | null>(null);
  const [audioNeedsTap, setAudioNeedsTap] = useState(false);

  async function refresh() {
    setErr(null);
    const { giveaway: g, error: gErr } = await giveawayService.getActiveGiveawayPublic();
    if (gErr) {
      setErr(gErr);
      setGiveaway(null);
      setEntries([]);
      return;
    }
    setGiveaway(g);
    if (!g) {
      setEntries([]);
      return;
    }
    const { entries: e, error: eErr } = await giveawayService.listEntries(g.id);
    if (eErr) setErr(eErr);
    setEntries(e);
    if (user?.id) setEntered(e.some((x) => x.user_id === user.id));
    else setEntered(false);
  }

  useEffect(() => {
    preloadGiveawayAudio();
  }, []);

  useEffect(() => {
    const unlock = () => {
      unlockGiveawayAudio();
      setAudioNeedsTap(false);
    };
    const opts = { capture: true } as const;
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('touchstart', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    return () => {
      window.removeEventListener('pointerdown', unlock, opts);
      window.removeEventListener('touchstart', unlock, opts);
      window.removeEventListener('keydown', unlock, opts);
    };
  }, []);

  useEffect(() => {
    if (loading || !giveaway) {
      setAudioNeedsTap(false);
      return;
    }
    const id = window.setTimeout(() => {
      if (!isGiveawayAudioUnlocked()) setAudioNeedsTap(true);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [loading, giveaway?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await refresh();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!giveaway?.ends_at) return;
    const tick = () => {
      const left = new Date(giveaway.ends_at).getTime() - nowMs();
      setTimeLeftMs(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [giveaway?.ends_at]);

  useEffect(() => {
    if (!giveaway?.id || replayWindowOver) return;
    if (!hasEnded || giveaway?.resolved_at) return;

    let cancelled = false;
    const giveawayId = giveaway.id;

    const tryResolve = async () => {
      if (cancelled) return;
      setResolving(true);
      const { data, error } = await giveawayService.resolve(giveawayId);
      if (cancelled) return;
      if (error) {
        setErr(error);
        setResolving(false);
        return;
      }
      if (data?.resolved) {
        await refresh();
        setResolving(false);
      }
    };

    // Resolve immediately when the timer ends (and keep polling until it succeeds).
    void tryResolve();
    window.clearInterval(pollTimerRef.current || undefined);
    pollTimerRef.current = window.setInterval(() => void tryResolve(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimerRef.current || undefined);
      pollTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giveaway?.id, giveaway?.resolved_at, hasEnded, replayWindowOver]);

  const segments = useMemo(() => {
    return entries.map((e) => ({
      id: e.id,
      label: e.full_name,
    }));
  }, [entries]);

  const inReplayWindow = Boolean(giveaway?.resolved_at && !replayWindowOver);

  /** Reveal spin runs on first paint when in replay window (no effect delay). */
  const showRevealSpin = Boolean(
    inReplayWindow && !replayDismissed && segments.length > 0 && winnerId
  );

  useEffect(() => {
    if (!inReplayWindow) {
      setReplayDismissed(false);
      return;
    }
    if (giveaway?.id) clearGiveawayRevealSeen(giveaway.id);
    setReplayDismissed(false);
  }, [giveaway?.id, giveaway?.resolved_at, inReplayWindow]);

  useEffect(() => {
    if (showRevealSpin) armRevealSpinAudio();
  }, [showRevealSpin]);

  const onSpinEnd = useCallback(() => {
    setReplayDismissed(true);
    confettiBurst();
    if (giveaway?.id) markGiveawayRevealSeen(giveaway.id);
  }, [giveaway?.id]);

  const replaySpinDone = replayDismissed;

  const showWinnerAnnouncement = Boolean(
    giveaway?.resolved_at && (replaySpinDone || segments.length === 0)
  );

  const wheelIdle = Boolean(giveaway && !giveaway.resolved_at && segments.length > 0);

  /** Monkeys loop only while waiting — never during/after reveal spin. */
  const shouldPlayWaitingMusic = Boolean(
    giveaway && wheelIdle && !showRevealSpin && !replayDismissed && segments.length > 0
  );

  useEffect(() => {
    if (giveaway?.id) resetGiveawayAudioForGiveaway(giveaway.id);
  }, [giveaway?.id]);

  useEffect(() => {
    if (loading || !giveaway) {
      stopGiveawayAmbience();
      return;
    }
    if (shouldPlayWaitingMusic) {
      startGiveawayAmbience();
    } else {
      stopGiveawayAmbience();
    }
    return () => stopGiveawayAmbience();
  }, [loading, giveaway?.id, shouldPlayWaitingMusic]);

  const canEnter = useMemo(() => {
    if (!giveaway) return false;
    if (giveaway.resolved_at) return false;
    if (hasEnded) return false;
    return true;
  }, [giveaway, hasEnded]);

  const enter = async () => {
    if (!giveaway?.id) return;
    setBusy(true);
    setErr(null);
    try {
      if (!user) {
        const { error } = await signInWithGoogle('/giveaway');
        if (error) setErr(error.message || 'Sign-in failed');
        return;
      }
      const { ok, alreadyEntered, error } = await giveawayService.enter(giveaway.id);
      if (!ok) {
        setErr(error || 'Could not enter the giveaway. Please try again.');
        return;
      }
      if (alreadyEntered) {
        setEntered(true);
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const winnerName = giveaway?.winner_name || null;
  const isAdmin = isAdminEmail(user?.email);
  const canManageGiveaway = Boolean(isAdmin && giveaway && !giveaway.resolved_at);

  const removeEntrant = async (entry: GiveawayEntry) => {
    const label = entry.full_name || entry.email;
    const ok = window.confirm(`Remove "${label}" from this giveaway? They will be off the wheel and out of the draw.`);
    if (!ok) return;
    setRemovingEntryId(entry.id);
    setErr(null);
    try {
      const { error } = await adminService.deleteGiveawayEntry({ entryId: entry.id });
      if (error) {
        setErr(error);
        return;
      }
      setReplayDismissed(false);
      await refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Remove entrant failed');
    } finally {
      setRemovingEntryId(null);
    }
  };

  const cancelGiveaway = async () => {
    const productId = giveaway?.product_id;
    if (!Number.isFinite(productId)) return;
    const ok = window.confirm('Cancel this giveaway? All entries will be deleted and the item returns to the shop.');
    if (!ok) return;
    setCanceling(true);
    setErr(null);
    try {
      const { error } = await adminService.cancelGiveaway({ productId });
      if (error) {
        setErr(error);
        return;
      }
      setReplayDismissed(false);
      await refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Cancel giveaway failed');
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="giveaway-page">
      <Seo title={`Giveaway — ${SITE_NAME}`} description="Enter the current giveaway and watch the wheel pick a winner." canonicalPath="/giveaway" />
      <Header />
      <PageHeadingRow title="Giveaway" fallbackTo="/" />
      <main className="giveaway-inner">
        {audioNeedsTap && !loading && giveaway && (
          <button
            type="button"
            className="giveaway-audio-hint"
            onClick={() => {
              unlockGiveawayAudio();
              setAudioNeedsTap(false);
            }}
          >
            Tap to enable sound
          </button>
        )}
        {loading ? (
          <p className="giveaway-muted">Loading…</p>
        ) : !giveaway ? (
          <div className="giveaway-empty">
            <h2 className="giveaway-empty-title">Next giveaway coming soon!</h2>
          </div>
        ) : (
          <>
            <section className="giveaway-hero">
              <div className="giveaway-hero-left">
                <h2 className="giveaway-item-title">{giveaway.product_name}</h2>
                <p className="giveaway-muted">
                  Winner gets this item for <strong>$0.00</strong>.
                </p>
                {!hasEnded ? (
                  <p className="giveaway-countdown">
                    Time left: <strong>{fmtTimeLeft(timeLeftMs)}</strong>
                  </p>
                ) : (
                  <p className="giveaway-countdown">
                    {showWinnerAnnouncement
                      ? 'Giveaway ended'
                      : resolving
                        ? 'Picking a winner…'
                        : giveaway.resolved_at
                          ? 'Spinning to reveal the winner…'
                          : 'Giveaway ended — starting the draw…'}
                  </p>
                )}

                <div className="giveaway-cta-stack">
                  <button
                    type="button"
                    className="checkout-btn-primary giveaway-enter-bar"
                    disabled={!canEnter || busy || entered}
                    onClick={() => void enter()}
                  >
                    {!user ? 'Sign in with Google to enter' : entered ? 'You’re entered' : busy ? 'Entering…' : 'Enter giveaway'}
                  </button>
                  <div className="giveaway-muted giveaway-entrants-line">
                    Entrants: <strong>{entries.length}</strong>
                  </div>
                </div>

                {!giveaway.resolved_at && (
                  <p className="giveaway-disclaimer">
                    One entry per person. Using multiple accounts to enter may result in disqualification from this
                    giveaway and future giveaways.
                  </p>
                )}

                {canManageGiveaway && (
                  <div className="giveaway-admin-actions">
                    <button
                      type="button"
                      className="admin-btn-danger-solid"
                      disabled={canceling || busy || Boolean(removingEntryId)}
                      onClick={() => void cancelGiveaway()}
                    >
                      {canceling ? 'Cancelling…' : 'Cancel giveaway'}
                    </button>
                  </div>
                )}

                {showWinnerAnnouncement && (
                  <>
                    <div className="giveaway-winner">
                      <div className="giveaway-winner-label">Winner</div>
                      <div className="giveaway-winner-name">{winnerName || 'No entries'}</div>
                    </div>
                    <div className="giveaway-participant-promo">
                      <div className="giveaway-participant-promo-label">For all participants</div>
                      <p className="giveaway-participant-promo-text">
                        Use code <strong className="giveaway-promo-code">YOGURT</strong> for 15% off sitewide!
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="giveaway-hero-right">
                {productImg ? (
                  <img className="giveaway-item-image" src={productImg} alt="" loading="lazy" />
                ) : (
                  <div className="giveaway-item-image giveaway-item-image--empty" aria-hidden />
                )}
              </div>
            </section>

            {err && <div className="checkout-alert checkout-alert--error">{err}</div>}

            <section className="giveaway-wheel-section">
              {segments.length === 0 ? (
                <div className="giveaway-wheel-empty">
                  {giveaway.resolved_at ? 'No entries were recorded for this giveaway.' : 'No entries yet — be the first.'}
                </div>
              ) : (
                <>
                  {hasEnded && !giveaway.resolved_at && (
                    <p className="giveaway-wheel-status" aria-live="polite">
                      {resolving ? 'Picking a winner…' : 'Get ready — the wheel will spin to reveal the winner.'}
                    </p>
                  )}
                  {giveaway.resolved_at && showRevealSpin && (
                    <p className="giveaway-wheel-status" aria-live="polite">
                      Spinning to reveal the winner…
                    </p>
                  )}
                  <GiveawayWheel
                    segments={segments}
                    selectedId={winnerId}
                    idle={wheelIdle}
                    spin={showRevealSpin}
                    onSpinEnd={onSpinEnd}
                  />
                </>
              )}

            </section>

            {canManageGiveaway && entries.length > 0 && (
              <section className="giveaway-names giveaway-admin-entrants" aria-label="Manage entrants">
                <h3 className="giveaway-names-title">Manage entrants</h3>
                <p className="giveaway-muted giveaway-admin-entrants-hint">
                  Remove someone who entered more than once or should be disqualified. Only you see this list.
                </p>
                <ul className="giveaway-admin-entrant-list">
                  {entries.map((entry) => (
                    <li key={entry.id} className="giveaway-admin-entrant-row">
                      <div className="giveaway-admin-entrant-meta">
                        <span className="giveaway-admin-entrant-name">{entry.full_name}</span>
                        <span className="giveaway-muted giveaway-admin-entrant-email">{entry.email}</span>
                        {entry.is_test && <span className="giveaway-admin-entrant-badge">Test</span>}
                      </div>
                      <button
                        type="button"
                        className="admin-btn-small admin-btn-danger"
                        disabled={Boolean(removingEntryId) || canceling || busy}
                        onClick={() => void removeEntrant(entry)}
                      >
                        {removingEntryId === entry.id ? 'Removing…' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default GiveawayPage;

