import React, { useEffect, useMemo, useRef } from 'react';
import { Wheel } from 'spin-wheel';
import { startWheelSpinSound, stopWheelSpinSound } from '../utils/giveawaySounds';

export type GiveawayWheelSegment = {
  id: string;
  label: string;
};

/** Degrees per second for slow continuous idle rotation. */
const IDLE_SPIN_SPEED = 32;

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

function wheelLabelForDisplay(label: string, entrantCount: number): string {
  if (entrantCount <= 20) return label;
  const maxLen = entrantCount <= 40 ? 16 : entrantCount <= 60 ? 12 : 9;
  const trimmed = label.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function wheelLabelStyle(entrantCount: number) {
  if (entrantCount <= 8) {
    return { itemLabelFontSizeMax: 28, itemLabelStrokeWidth: 3, lineWidth: 2, itemLabelRadiusMax: 0.42 };
  }
  if (entrantCount <= 16) {
    return { itemLabelFontSizeMax: 24, itemLabelStrokeWidth: 2, lineWidth: 2, itemLabelRadiusMax: 0.44 };
  }
  if (entrantCount <= 30) {
    return { itemLabelFontSizeMax: 18, itemLabelStrokeWidth: 2, lineWidth: 1.5, itemLabelRadiusMax: 0.48 };
  }
  if (entrantCount <= 50) {
    return { itemLabelFontSizeMax: 13, itemLabelStrokeWidth: 1.5, lineWidth: 1, itemLabelRadiusMax: 0.52 };
  }
  if (entrantCount <= 70) {
    return { itemLabelFontSizeMax: 10, itemLabelStrokeWidth: 1, lineWidth: 1, itemLabelRadiusMax: 0.56 };
  }
  return { itemLabelFontSizeMax: 7, itemLabelStrokeWidth: 1, lineWidth: 1, itemLabelRadiusMax: 0.6 };
}

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

  /** Rebuild canvas only when entrant list/content changes — not on every poll refresh. */
  const segmentKey = useMemo(
    () => items.map((s) => `${s.id}\x1f${s.label}`).join('\x1e'),
    [items],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host || items.length === 0) return;

    host.innerHTML = '';
    spinStartedRef.current = false;

    const entrantCount = items.length;
    const labelStyle = wheelLabelStyle(entrantCount);

    const wheel = new Wheel(host, {
      items: items.map((it) => ({
        label: wheelLabelForDisplay(it.label, entrantCount),
        backgroundColor: it.backgroundColor,
      })),
      borderColor: '#ffffff',
      borderWidth: entrantCount > 50 ? 2 : 3,
      lineColor: '#ffffff',
      lineWidth: labelStyle.lineWidth,
      radius: 0.94,
      pointerAngle: 0,
      itemLabelFont: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      itemLabelFontSizeMax: labelStyle.itemLabelFontSizeMax,
      itemLabelRadius: 0.9,
      itemLabelRadiusMax: labelStyle.itemLabelRadiusMax,
      itemLabelAlign: 'right',
      itemLabelRotation: 0,
      itemLabelColors: ['#ffffff'],
      itemLabelStrokeColor: '#000000',
      itemLabelStrokeWidth: labelStyle.itemLabelStrokeWidth,
      rotationResistance: 0,
      rotationSpeedMax: 400,
      isInteractive: false,
    });

    wheelRef.current = wheel;

    const resizeWheel = () => {
      try {
        wheel.resize();
      } catch {
        /* ignore */
      }
    };
    resizeWheel();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resizeWheel) : null;
    ro?.observe(host);

    return () => {
      ro?.disconnect();
      stopWheelSpinSound();
      try {
        wheel.stop();
        wheelRef.current?.remove();
      } catch {
        /* ignore */
      }
      wheelRef.current = null;
      host.innerHTML = '';
    };
  }, [segmentKey, items.length]);

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;

    if (spin) {
      wheel.stop();
      stopWheelSpinSound();
      return;
    }

    if (idle && items.length > 0) {
      wheel.rotationResistance = 0;
      wheel.spin(IDLE_SPIN_SPEED);
      stopWheelSpinSound();
      return;
    }

    wheel.stop();
    stopWheelSpinSound();
  }, [idle, spin, items.length, segmentKey]);

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
    startWheelSpinSound();

    const handleRest = () => {
      wheel.onRest = null;
      stopWheelSpinSound();
      onSpinEnd?.();
    };
    wheel.onRest = handleRest;

    // Same duration + revolutions for every visitor → same visual “show”.
    wheel.spinToItem(idx, 7000, true, 6, 1);

    return () => stopWheelSpinSound();
  }, [spin, selectedId, items, onSpinEnd]);

  return (
    <div className="giveaway-wheel-wrap">
      <div className="giveaway-wheel-pointer" aria-hidden />
      <div ref={hostRef} className="giveaway-wheel-host" />
    </div>
  );
};
