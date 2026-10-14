"use client";

// Procedural pack-opening sound effects via the Web Audio API — no audio files, no licensing.
// Arena-style: a tear/whoosh on rip, soft ticks on flips, and a bright chime on rare/mythic pulls.
// AudioContext starts suspended until a user gesture; the rip click resumes it.

let ctx: AudioContext | null = null;
let muted = false;
let loaded = false;

function ensureMuted() {
  if (loaded) return;
  loaded = true;
  try {
    muted = localStorage.getItem("mf-pack-muted") === "1";
  } catch {
    muted = false;
  }
}

export function isMuted(): boolean {
  ensureMuted();
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  loaded = true;
  try {
    localStorage.setItem("mf-pack-muted", m ? "1" : "0");
  } catch {
    // ignore
  }
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// A short burst of filtered noise — the "whoosh"/"tear" texture.
function noise(c: AudioContext, t0: number, dur: number, f0: number, f1: number, peak: number, q = 1) {
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, t0);
  bp.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.03, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

// A tone with a soft envelope (no clicks).
function tone(c: AudioContext, t0: number, freq: number, dur: number, peak: number, type: OscillatorType = "sine", slideTo?: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function playTear() {
  if (isMuted()) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  noise(c, t, 0.28, 900, 3200, 0.18, 0.8); // the rip
  noise(c, t + 0.02, 0.12, 400, 180, 0.12, 1.2); // low thump
}

export function playFlip() {
  if (isMuted()) return;
  const c = ac();
  if (!c) return;
  noise(c, c.currentTime, 0.07, 2600, 1400, 0.07, 1.5); // paper tick
}

export function playReveal(rarity: "common" | "uncommon" | "rare" | "mythic", foil = false) {
  if (isMuted()) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  if (rarity === "mythic") {
    // bright layered chord + shimmer sweep up
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, t + i * 0.04, f, 0.9, 0.12, "triangle"));
    tone(c, t + 0.05, 1200, 0.7, 0.05, "sine", 2600);
  } else if (rarity === "rare") {
    tone(c, t, 659.25, 0.5, 0.12, "triangle");
    tone(c, t + 0.08, 987.77, 0.55, 0.1, "triangle");
  } else if (rarity === "uncommon") {
    tone(c, t, 587.33, 0.3, 0.08, "sine");
  }
  if (foil) {
    // airy sparkle on top of any foil
    noise(c, t + 0.02, 0.5, 4000, 9000, 0.05, 0.6);
    tone(c, t + 0.1, 1568, 0.4, 0.04, "sine", 2300);
  }
}
