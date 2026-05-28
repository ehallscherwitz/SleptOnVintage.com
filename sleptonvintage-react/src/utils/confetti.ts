import confetti from 'canvas-confetti';
import { playWinTrumpet, unlockGiveawayAudio } from './giveawaySounds';

/** Short celebratory burst from both sides of the viewport. */
export function confettiBurst(durationMs = 2500): void {
  unlockGiveawayAudio();
  playWinTrumpet();
  try {
    const end = Date.now() + durationMs;
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
