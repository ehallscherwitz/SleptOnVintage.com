import React, { useEffect, useMemo, useRef } from 'react';
import * as SpinWheel from 'spin-wheel';

export type GiveawayWheelSegment = {
  id: string;
  label: string;
};

type Props = {
  segments: GiveawayWheelSegment[];
  /** Selected segment id (winner). */
  selectedId: string | null;
  /** When true, animate a spin to the winner. */
  spin: boolean;
  /** Called once after spin completes (or immediately if no winner). */
  onSpinEnd?: () => void;
};

export const GiveawayWheel: React.FC<Props> = ({ segments, selectedId, spin, onSpinEnd }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<any | null>(null);

  const items = useMemo(() => {
    const safe = (segments || []).map((s) => ({
      id: s.id,
      label: s.label,
    }));
    return safe;
  }, [segments]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;
    host.appendChild(canvas);

    const WheelCtor = (SpinWheel as any).Wheel;
    const wheel = new WheelCtor(canvas, {
      items: items.map((it, idx) => ({
        label: it.label,
        backgroundColor: idx % 2 === 0 ? '#121212' : '#1e1e1e',
        labelColor: '#ffffff',
      })),
      borderColor: '#ffffff',
      borderWidth: 2,
      lineColor: '#2a2a2a',
      lineWidth: 1,
      radius: 0.98,
      itemLabelFont: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      itemLabelFontSizeMax: 22,
      itemLabelRadiusMax: 0.9,
      itemLabelRotation: 0,
      itemLabelAlign: 'center',
      itemLabelColors: ['#fff'],
      rotationResistance: -35,
      // keep stable when re-rendering
      isInteractive: false,
    } as any);

    wheelRef.current = wheel;
    return () => {
      try {
        wheelRef.current?.remove();
      } catch {
        // ignore
      }
      wheelRef.current = null;
      host.innerHTML = '';
    };
  }, [items]);

  useEffect(() => {
    if (!spin) return;
    const wheel = wheelRef.current;
    if (!wheel) return;
    if (!selectedId) {
      onSpinEnd?.();
      return;
    }
    const idx = items.findIndex((x) => x.id === selectedId);
    if (idx < 0) return;

    const handleRest = () => {
      wheel.off('rest', handleRest as any);
      onSpinEnd?.();
    };
    wheel.on('rest', handleRest as any);
    // spin-wheel supports setting a target index via `spinToItem`.
    (wheel as any).spinToItem(idx, 9000, true, 8);
  }, [spin, selectedId, items, onSpinEnd]);

  return <div ref={hostRef} className="giveaway-wheel-host" />;
};

