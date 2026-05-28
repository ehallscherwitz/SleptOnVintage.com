import React, { useEffect, useMemo, useRef, useState } from 'react';
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

  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [replaySpin, setReplaySpin] = useState(false);
  const [replaySpinDone, setReplaySpinDone] = useState(false);

  const winnerId = useMemo(() => {
    if (!giveaway?.winner_email && !giveaway?.winner_name) return null;
    const match = entries.find(
      (e) =>
        (giveaway.winner_email && e.email === giveaway.winner_email) ||
        (giveaway.winner_name && e.full_name === giveaway.winner_name)
    );
    return match?.id ?? null;
  }, [giveaway, entries]);

  const hasEnded = useMemo(() => {
    if (!giveaway?.ends_at) return false;
    return nowMs() >= new Date(giveaway.ends_at).getTime();
  }, [giveaway]);

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

    // Giveaway ended but not resolved yet: repeatedly attempt to resolve until winner exists.
    window.clearInterval(pollTimerRef.current || undefined);
    pollTimerRef.current = window.setInterval(() => {
      void (async () => {
        const { data, error } = await giveawayService.resolve(giveaway.id);
        if (!error && data?.resolved) {
          await refresh();
        }
      })();
    }, 3000);

    return () => {
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

  useEffect(() => {
    // Within 24h after end: replay the reveal spin on every visit (winner is already fixed in DB).
    if (!inReplayWindow) {
      setReplaySpin(false);
      setReplaySpinDone(false);
      return;
    }
    setReplaySpinDone(false);
    setReplaySpin(true);
  }, [giveaway?.id, giveaway?.resolved_at, inReplayWindow]);

  const onSpinEnd = () => {
    setReplaySpin(false);
    setReplaySpinDone(true);
    confettiBurst();
  };

  const wheelIdle = Boolean(giveaway && !giveaway.resolved_at && segments.length > 0);

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
  const canCancelGiveaway = Boolean(isAdmin && giveaway && !giveaway.resolved_at);

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
      setReplaySpin(false);
      setReplaySpinDone(false);
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
                    Giveaway ended{giveaway.resolved_at ? '' : ' — resolving…'}
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

                {canCancelGiveaway && (
                  <div className="giveaway-admin-actions">
                    <button
                      type="button"
                      className="admin-btn-danger-solid"
                      disabled={canceling || busy}
                      onClick={() => void cancelGiveaway()}
                    >
                      {canceling ? 'Cancelling…' : 'Cancel giveaway'}
                    </button>
                  </div>
                )}

                {giveaway.resolved_at && (
                  <div className="giveaway-winner">
                    <div className="giveaway-winner-label">Winner</div>
                    <div className="giveaway-winner-name">{winnerName || 'No entries'}</div>
                  </div>
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
                <div className="giveaway-wheel-empty">No entries yet — be the first.</div>
              ) : (
                <GiveawayWheel
                  segments={segments}
                  selectedId={winnerId}
                  idle={wheelIdle}
                  spin={replaySpin}
                  onSpinEnd={onSpinEnd}
                />
              )}

              {giveaway.resolved_at && replaySpinDone && (
                <p className="giveaway-muted giveaway-replay-note">
                  Replay window: this giveaway stays visible for 24 hours after it ends.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default GiveawayPage;

