/** Web Audio SFX for the giveaway wheel (no external assets). */

let sharedCtx: AudioContext | null = null;
let spinSession: { stop: () => void } | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedCtx) sharedCtx = new Ctx();
    if (sharedCtx.state === 'suspended') void sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Call once after user gesture so timer-end spin can play audio. */
export function unlockGiveawayAudio(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
}

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playTick(ctx: AudioContext, volume = 0.12): void {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(280, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.04);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

/** Looping whoosh + optional ticks while the wheel spins. */
export function startWheelSpinSound(mode: 'idle' | 'reveal'): void {
  stopWheelSpinSound();
  const ctx = getCtx();
  if (!ctx) return;

  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx);
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = mode === 'idle' ? 700 : 1400;
  filter.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.value = mode === 'idle' ? 0.06 : 0.14;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();

  let tickId: number | undefined;
  if (mode === 'reveal') {
    let interval = 140;
    const scheduleTicks = () => {
      playTick(ctx, 0.14);
      interval = Math.min(320, interval + 8);
      tickId = window.setTimeout(scheduleTicks, interval);
    };
    scheduleTicks();
  }

  spinSession = {
    stop: () => {
      if (tickId !== undefined) window.clearTimeout(tickId);
      const end = ctx.currentTime + 0.12;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, end);
      try {
        source.stop(end);
      } catch {
        /* already stopped */
      }
      spinSession = null;
    },
  };
}

export function stopWheelSpinSound(): void {
  spinSession?.stop();
  spinSession = null;
}

/** Short brass-style fanfare when confetti runs. */
export function playWinTrumpet(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const t = ctx.currentTime;
  const notes = [392, 523.25, 659.25, 784]; // G4 C5 E5 G5

  notes.forEach((freq, i) => {
    const start = t + i * 0.14;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, start);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, start);
    filter.frequency.exponentialRampToValueAtTime(600, start + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}
