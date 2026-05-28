/** Giveaway page audio: waiting music, reveal wheel SFX, win fanfare. */

const AMBIENCE_SRC = '/audio/monkeys-spinning-monkeys.mp3';
const WHEEL_SPIN_SRC = '/audio/mixkit-bike-wheel-spinning-1613.wav';

/** Low volume while waiting for the reveal spin. */
const WAITING_MUSIC_VOLUME = 0.18;
const WHEEL_REVEAL_VOLUME = 0.75;

let sharedCtx: AudioContext | null = null;
let ambienceEl: HTMLAudioElement | null = null;
let wheelEl: HTMLAudioElement | null = null;
let wheelBuffer: AudioBuffer | null = null;
let wheelBufferPromise: Promise<AudioBuffer | null> | null = null;
let wheelSource: AudioBufferSourceNode | null = null;
let wheelGain: GainNode | null = null;
let audioUnlocked = false;
let wantWaitingMusic = false;
let wheelRevealActive = false;
let revealSpinPending = false;
let revealFinished = false;
let lastGiveawayId: string | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedCtx) sharedCtx = new Ctx();
    return sharedCtx;
  } catch {
    return null;
  }
}

function resumeCtx(): void {
  const ctx = getCtx();
  if (ctx?.state === 'suspended') void ctx.resume();
}

function makeAudio(src: string, loop: boolean): HTMLAudioElement {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.preload = 'auto';
  audio.setAttribute('playsinline', '');
  audio.setAttribute('webkit-playsinline', '');
  return audio;
}

function getAmbienceEl(): HTMLAudioElement {
  if (!ambienceEl) {
    ambienceEl = makeAudio(AMBIENCE_SRC, true);
  }
  return ambienceEl;
}

function getWheelEl(): HTMLAudioElement {
  if (!wheelEl) {
    wheelEl = makeAudio(WHEEL_SPIN_SRC, true);
  }
  return wheelEl;
}

function loadWheelBuffer(): Promise<AudioBuffer | null> {
  if (wheelBuffer) return Promise.resolve(wheelBuffer);
  if (wheelBufferPromise) return wheelBufferPromise;

  wheelBufferPromise = (async () => {
    const ctx = getCtx();
    if (!ctx) return null;
    try {
      resumeCtx();
      const res = await fetch(WHEEL_SPIN_SRC);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      wheelBuffer = await ctx.decodeAudioData(data);
      return wheelBuffer;
    } catch {
      return null;
    }
  })();

  return wheelBufferPromise;
}

function stopWheelWebAudio(): void {
  try {
    wheelSource?.stop();
  } catch {
    /* already stopped */
  }
  wheelSource?.disconnect();
  wheelGain?.disconnect();
  wheelSource = null;
  wheelGain = null;
}

function startWheelWebAudio(): boolean {
  const ctx = getCtx();
  if (!ctx || !wheelBuffer) return false;

  stopWheelWebAudio();
  resumeCtx();

  const src = ctx.createBufferSource();
  src.buffer = wheelBuffer;
  src.loop = true;

  wheelGain = ctx.createGain();
  wheelGain.gain.value = WHEEL_REVEAL_VOLUME;
  src.connect(wheelGain);
  wheelGain.connect(ctx.destination);
  src.start(0);
  wheelSource = src;
  return true;
}

/** Start loading files as soon as the giveaway page mounts. */
export function preloadGiveawayAudio(): void {
  getAmbienceEl().load();
  getWheelEl().load();
  void loadWheelBuffer();
}

/** Allow waiting music again when the active giveaway changes. */
export function resetGiveawayAudioForGiveaway(giveawayId: string): void {
  if (lastGiveawayId === giveawayId) return;
  lastGiveawayId = giveawayId;
  revealFinished = false;
}

function playWhenReady(audio: HTMLAudioElement): void {
  const tryPlay = () => {
    if (!audio.paused) return;
    void audio
      .play()
      .then(() => {
        audioUnlocked = true;
      })
      .catch(() => {
        /* blocked until unlock */
      });
  };

  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    tryPlay();
    return;
  }

  const onReady = () => {
    audio.removeEventListener('canplaythrough', onReady);
    audio.removeEventListener('loadeddata', onReady);
    tryPlay();
  };
  audio.addEventListener('canplaythrough', onReady, { once: true });
  audio.addEventListener('loadeddata', onReady, { once: true });
  if (audio.networkState === HTMLMediaElement.NETWORK_EMPTY) {
    audio.load();
  }
}

function startWheelRevealPlayback(): void {
  const w = getWheelEl();
  w.volume = WHEEL_REVEAL_VOLUME;
  playWhenReady(w);

  void loadWheelBuffer().then((buf) => {
    if (!buf || (!wheelRevealActive && !revealSpinPending)) return;
    if (startWheelWebAudio()) {
      w.pause();
    }
  });
}

function retryActiveAudioSync(): void {
  resumeCtx();
  void loadWheelBuffer();

  const inReveal = wheelRevealActive || revealSpinPending;

  if (wantWaitingMusic && !revealFinished && !inReveal) {
    const a = getAmbienceEl();
    a.volume = WAITING_MUSIC_VOLUME;
    playWhenReady(a);
  }

  if (inReveal) {
    startWheelRevealPlayback();
  }
}

/** Call after user gesture so reveal spin audio can play. */
export function unlockGiveawayAudio(): void {
  audioUnlocked = true;
  retryActiveAudioSync();
}

export function isGiveawayAudioUnlocked(): boolean {
  return audioUnlocked;
}

/** Waiting-room loop only (slow idle wheel, before reveal spin). */
export function startGiveawayAmbience(): void {
  if (revealFinished || wheelRevealActive || revealSpinPending) return;
  wantWaitingMusic = true;
  const a = getAmbienceEl();
  a.volume = WAITING_MUSIC_VOLUME;
  playWhenReady(a);
}

export function stopGiveawayAmbience(): void {
  wantWaitingMusic = false;
  ambienceEl?.pause();
  if (ambienceEl) ambienceEl.currentTime = 0;
}

/** Stop waiting music as soon as a reveal spin is queued (before the wheel may be ready). */
export function armRevealSpinAudio(): void {
  revealSpinPending = true;
  wantWaitingMusic = false;
  stopGiveawayAmbience();
}

/** Bike-wheel SFX during the winner reveal spin (music must be off). */
export function startWheelSpinSound(): void {
  wheelRevealActive = true;
  revealSpinPending = true;
  wantWaitingMusic = false;
  stopGiveawayAmbience();

  wheelEl?.pause();
  if (wheelEl) wheelEl.currentTime = 0;
  stopWheelWebAudio();

  startWheelRevealPlayback();
}

/** End reveal spin; optional trumpet exactly when the wheel stops. */
export function stopWheelSpinSound(playTrumpet = false): void {
  wheelRevealActive = false;
  revealSpinPending = false;
  stopWheelWebAudio();
  wheelEl?.pause();
  if (wheelEl) wheelEl.currentTime = 0;
  stopGiveawayAmbience();

  if (playTrumpet) {
    revealFinished = true;
    playWinTrumpet();
  }
}

/** Short brass-style fanfare when confetti runs (synthesized). */
export function playWinTrumpet(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const playNotes = () => {
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
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  };

  if (ctx.state === 'suspended') {
    void ctx.resume().then(playNotes).catch(() => {
      /* no audio */
    });
    return;
  }
  playNotes();
}
