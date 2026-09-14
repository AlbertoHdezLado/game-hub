import { useRef } from 'react';

// same tone patterns as legacy shared per-game <script> (Mímica/Time's Up/Tabú): correct (rising sine
// double-beep), skip (falling triangle), foul (harsh sawtooth double-beep), alarm (3x square beep)
export function useGameAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  function unlock() {
    if (!ctxRef.current) {
      try { ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { ctxRef.current = null; }
    } else if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
  }

  function tone(type: OscillatorType, freq: number, startOffset: number, duration: number, peakGain: number) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + startOffset);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + startOffset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + startOffset);
    osc.stop(now + startOffset + duration + 0.02);
  }

  function playAlarm() {
    [0, 0.3, 0.6].forEach((offset) => tone('square', 880, offset, 0.25, 0.25));
  }
  function playCorrect() {
    tone('sine', 880, 0, 0.18, 0.3);
    tone('sine', 1320, 0.09, 0.18, 0.3);
  }
  function playSkip() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }
  function playFoul() {
    [0, 0.12].forEach((offset) => tone('sawtooth', 180, offset, 0.22, 0.28));
  }

  return { unlock, playAlarm, playCorrect, playSkip, playFoul };
}
