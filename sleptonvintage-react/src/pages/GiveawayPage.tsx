import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import { PageHeadingRow } from '../components/PageHeadingRow';
import { Seo } from '../components/Seo';
import { SITE_NAME } from '../constants/legal';
import { giveawayService, type GiveawayEntry } from '../services/giveawayService';
import { GiveawayWheel } from '../components/GiveawayWheel';
import { getPrimaryProductImageUrl, type Product } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

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

function confettiBurst() {
  try {
    const end = Date.now() + 2500;
    const colors = ['#ffffff', '#ffd166', '#ef476f', '#06d6a0', '#118ab2'];
    const tick = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  } catch {
    // ignore
  }
}

function winnerSpinKey(giveawayId: string, resolvedAtIso: string | null): string {
  return `giveaway_spin_v1:${giveawayId}:${resolvedAtIso || 'unresolved'}`;
}

const GiveawayPage: React.FC = () => {
  const { user, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [giveaway, setGiveaway] = useState<any | null>(null);
  const [entries, setEntries] = useState<GiveawayEntry[]>([]);
  const [entered, setEntered] = useState(false);
  const [busy, setBusy] = useState(false);

  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [spin, setSpin] = useState(false);
  const [spinDone, setSpinDone] = useState(false);

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

  useEffect(() => {
    // When resolved, spin exactly once per resolved_at (per browser) and show confetti.
    if (!giveaway?.id || !giveaway?.resolved_at) return;
    const key = winnerSpinKey(giveaway.id, giveaway.resolved_at);
    const already = localStorage.getItem(key) === 'done';
    if (already) {
      setSpinDone(true);
      setSpin(false);
      return;
    }
    setSpin(true);
  }, [giveaway?.id, giveaway?.resolved_at]);

  const onSpinEnd = () => {
    if (!giveaway?.id) return;
    setSpin(false);
    setSpinDone(true);
    if (giveaway?.resolved_at) {
      localStorage.setItem(winnerSpinKey(giveaway.id, giveaway.resolved_at), 'done');
    }
    confettiBurst();
  };

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
        const { error } = await signInWithGoogle();
        if (error) setErr(error.message || 'Sign-in failed');
        return;
      }
      const { ok, error } = await giveawayService.enter(giveaway.id);
      if (!ok) {
        setErr(error || 'Could not enter giveaway');
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const segments = useMemo(() => {
    return entries.map((e) => ({
      id: e.id,
      label: e.full_name,
    }));
  }, [entries]);

  const winnerName = giveaway?.winner_name || null;

  return (
    <div className="giveaway-page">
      <Seo title={`Giveaway — ${SITE_NAME}`} description="Enter the current giveaway and watch the wheel pick a winner." canonicalPath="/giveaway" />
      <Header />
      <PageHeadingRow title="Giveaway" fallbackTo="/" />
      <main className="giveaway-inner">
        <h1 className="giveaway-title">Giveaway</h1>

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

                <div className="giveaway-cta-row">
                  <button
                    type="button"
                    className="checkout-btn-primary"
                    disabled={!canEnter || busy || entered}
                    onClick={() => void enter()}
                  >
                    {!user ? 'Sign in with Google to enter' : entered ? 'You’re entered' : busy ? 'Entering…' : 'Enter giveaway'}
                  </button>
                  <div className="giveaway-muted">
                    Entrants: <strong>{entries.length}</strong>
                  </div>
                </div>

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
                  spin={spin && Boolean(giveaway.resolved_at)}
                  onSpinEnd={onSpinEnd}
                />
              )}

              {giveaway.resolved_at && spinDone && (
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

