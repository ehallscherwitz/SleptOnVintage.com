/** Giveaway page audio: ambience + wheel spin (files in /public/audio), win fanfare (Web Audio). */

const AMBIENCE_SRC = '/audio/Monkeys%20Spinning%20Monkeys.mp3';
const WHEEL_SPIN_SRC = '/audio/mixkit-bike-wheel-spinning-1613.wav';

const AMBIENCE_VOLUME = 0.32;
const AMBIENCE_DUCKED_VOLUME = 0.1;
const WHEEL_IDLE_VOLUME = 0.55;
const WHEEL_REVEAL_VOLUME = 0.75;

let sharedCtx: AudioContext | null = null;
let ambienceAudio: HTMLAudioElement | null = null;
let wheelSpinAudio: HTMLAudioElement | null = null;
let spinSession: { stop: () => void } | null = null;
let audioUnlocked = false;

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

function makeAudio(src: string, loop: boolean): HTMLAudioElement {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.preload = 'auto';
  return audio;
}

async function primeElement(audio: HTMLAudioElement): Promise<void> {
  const prev = audio.volume;
  audio.volume = 0;
  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
  } catch {
    /* gesture required */
  }
  audio.volume = prev;
}

/** Call after user gesture so timer-end spin and ambience can play. */
export function unlockGiveawayAudio(): void {
  getCtx();
  if (audioUnlocked) return;
  audioUnlocked = true;
  void primeElement(makeAudio(AMBIENCE_SRC, true));
  void primeElement(makeAudio(WHEEL_SPIN_SRC, true));
}

/** Background loop on the giveaway page (/giveaway). */
export function startGiveawayAmbience(): void {
  stopGiveawayAmbience();
  ambienceAudio = makeAudio(AMBIENCE_SRC, true);
  ambienceAudio.volume = AMBIENCE_VOLUME;
  void ambienceAudio.play().catch(() => {
    /* blocked until unlock */
  });
}

export function stopGiveawayAmbience(): void {
  if (!ambienceAudio) return;
  ambienceAudio.pause();
  ambienceAudio.currentTime = 0;
  ambienceAudio = null;
}

function duckAmbience(): void {
  if (ambienceAudio) ambienceAudio.volume = AMBIENCE_DUCKED_VOLUME;
}

function restoreAmbienceVolume(): void {
  if (ambienceAudio) ambienceAudio.volume = AMBIENCE_VOLUME;
}

/** Bike-wheel SFX while the canvas wheel is spinning (idle or reveal). */
export function startWheelSpinSound(mode: 'idle' | 'reveal'): void {
  stopWheelSpinSound();
  duckAmbience();

  wheelSpinAudio = makeAudio(WHEEL_SPIN_SRC, true);
  wheelSpinAudio.volume = mode === 'idle' ? WHEEL_IDLE_VOLUME : WHEEL_REVEAL_VOLUME;
  void wheelSpinAudio.play().catch(() => {
    /* blocked until unlock */
  });

  spinSession = {
    stop: () => {
      if (wheelSpinAudio) {
        wheelSpinAudio.pause();
        wheelSpinAudio.currentTime = 0;
        wheelSpinAudio = null;
      }
      restoreAmbienceVolume();
      spinSession = null;
    },
  };
}

export function stopWheelSpinSound(): void {
  spinSession?.stop();
  spinSession = null;
}

/** Short brass-style fanfare when confetti runs (synthesized). */
export function playWinTrumpet(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const t = ctx.currentTime;
  const notes = [392, 523.25, 659.25, 784];

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
