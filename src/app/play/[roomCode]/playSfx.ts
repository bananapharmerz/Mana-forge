// Procedural play-room sound effects (Web Audio API) — no audio files, nothing to license.
// Fired on the local player's own actions (tap, cast, draw, shuffle) for an Arena-style tactile
// feel. Everything is wrapped so a blocked/absent AudioContext just means silence.

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

const MUTE_KEY = "mf-play-muted";
let muted = false;
try {
  if (typeof window !== "undefined") muted = window.localStorage.getItem(MUTE_KEY) === "1";
} catch {
  // localStorage blocked — default to sound on
}
export function isMuted(): boolean {
  return muted;
}
export function setMuted(v: boolean): void {
  muted = v;
  try {
    window.localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, peak: number, endFreq?: number) {
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(start: number, dur: number, peak: number, filterHz: number, q = 0.7) {
  const c = ac();
  if (!c) return;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterHz;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(start);
  src.stop(start + dur + 0.02);
}

export function playTap(): void {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  tone(240, t, 0.05, "square", 0.08, 150);
  tone(1500, t, 0.03, "triangle", 0.04);
}

export function playCast(): void {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  tone(150, t, 0.22, "sine", 0.16, 70); // thud
  noise(t, 0.16, 0.05, 2600); // airy swell
  tone(1320, t + 0.04, 0.18, "triangle", 0.05); // faint gold shimmer
  tone(1760, t + 0.06, 0.16, "triangle", 0.035);
}

export function playDraw(): void {
  if (muted) return;
  const c = ac();
  if (!c) return;
  noise(c.currentTime, 0.11, 0.09, 3200, 0.5); // single paper slide
}

export function playShuffle(): void {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  for (let i = 0; i < 5; i++) noise(t + i * 0.07, 0.06, 0.07, 3000 + Math.random() * 1200, 0.5);
}
