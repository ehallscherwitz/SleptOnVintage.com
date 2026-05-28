import React, { useEffect, useMemo, useRef } from 'react';
import { Wheel } from 'spin-wheel';

export type GiveawayWheelSegment = {
  id: string;
  label: string;
};

/** Distinct slice colors (wheelofnames-style). */
const SLICE_COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#ca8a04',
  '#9333ea',
  '#db2777',
  '#0891b2',
  '#ea580c',
  '#4f46e5',
  '#0d9488',
  '#b91c1c',
  '#65a30d',
];

type Props = {
  segments: GiveawayWheelSegment[];
  /** Winner entry id — used when spinning to land on the correct slice. */
  selectedId: string | null;
  /** Slow idle rotation before the giveaway is resolved. */
  idle?: boolean;
  /** Play the “reveal” spin to the winner (same target for every visitor). */
  spin?: boolean;
  onSpinEnd?: () => void;
};

export const GiveawayWheel: React.FC<Props> = ({ segments, selectedId, idle = false, spin = false, onSpinEnd }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wheelRef = useRef<any>(null);
  const spinStartedRef = useRef(false);

  const items = useMemo(() => {
    return (segments || []).map((s, idx) => ({
      id: s.id,
      label: s.label,
      backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length],
    }));
  }, [segments]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = '';
    spinStartedRef.current = false;

    const wheel = new Wheel(host, {
      items: items.map((it) => ({
        label: it.label,
        backgroundColor: it.backgroundColor,
      })),
      borderColor: '#ffffff',
      borderWidth: 3,
      lineColor: '#ffffff',
      lineWidth: 2,
      radius: 0.92,
      pointerAngle: 0,
      itemLabelFont: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      itemLabelFontSizeMax: 28,
      itemLabelRadius: 0.88,
      itemLabelRadiusMax: 0.42,
      itemLabelAlign: 'right',
      itemLabelRotation: 0,
      itemLabelColors: ['#ffffff'],
      itemLabelStrokeColor: '#000000',
      itemLabelStrokeWidth: 3,
      rotationResistance: -35,
      rotationSpeedMax: 400,
      isInteractive: false,
    });

    wheelRef.current = wheel;
    return () => {
      try {
        wheel.stop();
        wheelRef.current?.remove();
      } catch {
        /* ignore */
      }
      wheelRef.current = null;
      host.innerHTML = '';
    };
  }, [items]);

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;

    if (spin) {
      wheel.stop();
      return;
    }

    if (idle && items.length > 0) {
      wheel.spin(14);
      return;
    }

    wheel.stop();
  }, [idle, spin, items.length]);

  useEffect(() => {
    if (!spin || spinStartedRef.current) return;
    const wheel = wheelRef.current;
    if (!wheel) return;

    if (!selectedId || items.length === 0) {
      onSpinEnd?.();
      return;
    }

    const idx = items.findIndex((x) => x.id === selectedId);
    if (idx < 0) {
      onSpinEnd?.();
      return;
    }

    spinStartedRef.current = true;
    wheel.stop();

    const handleRest = () => {
      wheel.onRest = null;
      onSpinEnd?.();
    };
    wheel.onRest = handleRest;

    // Same duration + revolutions for every visitor → same visual “show”.
    wheel.spinToItem(idx, 7000, true, 6, 1);
  }, [spin, selectedId, items, onSpinEnd]);

  return (
    <div className="giveaway-wheel-wrap">
      <div className="giveaway-wheel-pointer" aria-hidden />
      <div ref={hostRef} className="giveaway-wheel-host" />
    </div>
  );
};
