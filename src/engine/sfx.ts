// Small synthesized sound effects (no audio files needed, works offline).
// Kept soft: no harsh buzzers for mistakes.

let ctx: AudioContext | null = null;
let enabled = true;

export function setSfxEnabled(on: boolean) {
  enabled = on;
}

/** The shared audio context (also used to play recorded voices). */
export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    return null;
  }
  return ctx;
}

function ac(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from the first tap so iOS allows sound. */
export function unlockAudio() {
  const c = audioContext();
  if (!c) return;
  const b = c.createBuffer(1, 1, 22050);
  const s = c.createBufferSource();
  s.buffer = b;
  s.connect(c.destination);
  s.start(0);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(start: number, dur: number, vol = 0.25, hp = 800) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination);
  s.start(t0);
}

const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];

export const sfx = {
  /** balloon pop */
  pop() {
    noise(0, 0.12, 0.35, 1200);
    tone(900, 0, 0.08, 'triangle', 0.12, 300);
  },
  /** item snapped into the right place */
  snap() {
    tone(660, 0, 0.12, 'triangle', 0.16);
    tone(990, 0.07, 0.16, 'triangle', 0.14);
  },
  /** gentle "nope" — soft and low, never harsh */
  nope() {
    tone(330, 0, 0.14, 'sine', 0.12, 280);
    tone(294, 0.12, 0.16, 'sine', 0.1, 250);
  },
  /** soft tap feedback */
  tap() {
    tone(1200, 0, 0.05, 'sine', 0.06);
  },
  /** rising sparkle used while tracing; step 0..1 */
  trace(step: number) {
    tone(500 + step * 700, 0, 0.07, 'sine', 0.05);
  },
  /** counting blip, pitch rises with n */
  count(n: number) {
    tone(NOTES[Math.min(n, NOTES.length - 1)], 0, 0.18, 'triangle', 0.16);
  },
  /** pattern pad tones */
  pad(i: number) {
    const f = [392, 523.25, 659.25, 783.99][i % 4];
    tone(f, 0, 0.35, 'triangle', 0.18);
  },
  /** short round win */
  win() {
    [0, 2, 4, 7].forEach((n, i) => tone(NOTES[n], i * 0.09, 0.22, 'triangle', 0.15));
  },
  /** big session celebration */
  fanfare() {
    [0, 2, 4, 7, 4, 7].forEach((n, i) => tone(NOTES[n], i * 0.12, 0.3, 'triangle', 0.16));
    tone(NOTES[7], 0.75, 0.6, 'sine', 0.14);
  },
  /** rocket whoosh */
  whoosh() {
    noise(0, 0.9, 0.18, 300);
    tone(200, 0, 0.9, 'sawtooth', 0.04, 900);
  },
  /** block lands */
  thud() {
    tone(180, 0, 0.12, 'sine', 0.22, 90);
  },
  /** a step in the maze */
  step() {
    tone(740, 0, 0.05, 'sine', 0.07);
  },
};
