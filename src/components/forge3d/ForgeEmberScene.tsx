"use client";

import { useEffect, useRef } from "react";
import { createTimeline, animate, utils } from "animejs";
import Ember from "@/components/Ember";

// The homepage hero's centrepiece: Ember at work on the anvil. Plain SVG (no three.js) so it shows
// straight away and is the same on every device. The whole strike cycle is driven by ONE anime.js
// timeline (see the effect below) instead of a pile of CSS @keyframes, so every piece — the hammer
// swing, the anvil wobble, the squash, the strike flash, the smoke and the five-colour spark burst —
// is locked to a single impact beat at IMPACT ms and is trivial to retune. The flying trail sparks are
// a separate <canvas> (ForgeSparks) layered over this. Everything is skipped for reduced-motion.
//
// Ember fills inset-x-[14%] top-[19%] at a 400x400 viewBox; the hammer + forearm live in a sibling SVG
// sharing that exact box so the grip lands on her hand (316,306) and the head reaches the anvil face.
// The forearm pivots at her shoulder (286,252); the hammer pivots at the hand for the wrist snap.

// The on-impact star burst: a 4-point sparkle in each of the five mana colours (W, U, B, R, G),
// flying out from the anvil face on the strike beat.
const STAR_D = "M0 -7 C 1.2 -2, 2 -1.2, 7 0 C 2 1.2, 1.2 2, 0 7 C -1.2 2, -2 1.2, -7 0 C -2 -1.2, -1.2 -2, 0 -7 Z";
const BURST = [
  { dx: -38, dy: -34, c: "#f6efd0" }, // W
  { dx: -22, dy: -48, c: "#49a3e0" }, // U
  { dx: -6, dy: -52, c: "#9a73d6" }, // B
  { dx: 14, dy: -50, c: "#ff5a3c" }, // R
  { dx: 32, dy: -38, c: "#49b56a" }, // G
  { dx: 46, dy: -22, c: "#f6efd0" },
  { dx: -50, dy: -18, c: "#49a3e0" },
  { dx: 26, dy: -54, c: "#ff5a3c" },
  { dx: -30, dy: -44, c: "#49b56a" },
  { dx: 10, dy: -58, c: "#9a73d6" },
];

// One full strike cycle. Impact (hammer meets steel) is the shared instant everything keys off.
const IMPACT = 650;

// Pass a positioning class (absolute …); it defaults to relative.
export default function ForgeEmberScene({ className = "relative" }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return; // reduced motion: leave the static resting pose from CSS
    }

    const q = <T extends Element>(sel: string) => Array.from(el.querySelectorAll<T>(sel));
    const hammer = el.querySelector<SVGGElement>(".forge-hammer");
    const arm = el.querySelector<SVGGElement>(".forge-arm");
    const headhit = el.querySelector<SVGGElement>(".forge-headhit");
    const anvil = el.querySelector<SVGSVGElement>(".forge-anvil");
    const strike = el.querySelector<SVGEllipseElement>(".forge-strike");
    const smoke = el.querySelector<SVGEllipseElement>(".forge-smoke");
    const bob = q<HTMLDivElement>(".forge-bob");
    const stars = q<SVGPathElement>(".forge-star");

    // Pin the starting pose (anime.js reads these as the keyframe-0 values).
    if (hammer) utils.set(hammer, { rotate: 106 });
    if (arm) utils.set(arm, { rotate: -2 });
    if (headhit) utils.set(headhit, { scaleY: 1 });
    if (anvil) utils.set(anvil, { rotate: 0 });
    if (strike) utils.set(strike, { opacity: 0.12 });
    if (smoke) utils.set(smoke, { opacity: 0, translateY: 0, scale: 0.4 });
    utils.set(bob, { translateY: -3 });
    stars.forEach((s) => utils.set(s, { opacity: 0, translateX: 0, translateY: 0, scale: 0.2, rotate: 0 }));

    const tl = createTimeline({ loop: true, defaults: { ease: "inOut(2)" } });

    // Hammer — raise, cock, SNAP down onto the steel, bounce, lift back up.
    if (hammer)
      tl.add(
        hammer,
        {
          rotate: [
            { to: 114, duration: 416, ease: "inOut(2)" }, // ease up to the top
            { to: 2, duration: 234, ease: "in(2.4)" }, // flick down — accelerate into the anvil
            { to: 14, duration: 91, ease: "out(2)" }, // bounce off the steel
            { to: 60, duration: 221, ease: "out(1.6)" }, // lift away
            { to: 106, duration: 338, ease: "inOut(2)" }, // back to the top
          ],
        },
        0,
      );

    // Forearm — a small pump about the shoulder on the strike; the wrist does the real work.
    if (arm)
      tl.add(
        arm,
        {
          rotate: [
            { to: -4, duration: 442, ease: "inOut(2)" },
            { to: 4, duration: 208, ease: "in(2.4)" },
            { to: 0, duration: 130, ease: "out(2)" },
            { to: -2, duration: 520, ease: "inOut(2)" },
          ],
        },
        0,
      );

    // Steel head squashes on impact, then springs back — bouncy cartoon hit.
    if (headhit)
      tl.add(
        headhit,
        {
          scaleY: [
            { to: 1, duration: 598 },
            { to: 0.72, duration: 78, ease: "in(2)" },
            { to: 1.08, duration: 104, ease: "out(2)" },
            { to: 1, duration: 130, ease: "out(2)" },
            { to: 1, duration: 390 },
          ],
        },
        0,
      );

    // Anvil takes the blow — a quick damped wobble.
    if (anvil)
      tl.add(
        anvil,
        {
          rotate: [
            { to: 0, duration: 624 },
            { to: 1.3, duration: 65, ease: "out(2)" },
            { to: -0.9, duration: 91, ease: "inOut(2)" },
            { to: 0.4, duration: 104, ease: "inOut(2)" },
            { to: 0, duration: 416, ease: "out(2)" },
          ],
        },
        0,
      );

    // Strike glow on the anvil face — flares on contact, fades out.
    if (strike)
      tl.add(
        strike,
        {
          opacity: [
            { to: 0.12, duration: 546 },
            { to: 0.95, duration: 78, ease: "out(2)" },
            { to: 0.3, duration: 182, ease: "out(2)" },
            { to: 0.12, duration: 494, ease: "out(2)" },
          ],
        },
        0,
      );

    // Puff of smoke where the hammer lands.
    if (smoke)
      tl.add(
        smoke,
        {
          opacity: [
            { to: 0, duration: 637 },
            { to: 0.45, duration: 91, ease: "out(2)" },
            { to: 0, duration: 572, ease: "out(2)" },
          ],
          translateY: [
            { to: 0, duration: 637 },
            { to: -6, duration: 91, ease: "out(2)" },
            { to: -20, duration: 572, ease: "out(2)" },
          ],
          scale: [
            { to: 0.4, duration: 637 },
            { to: 0.85, duration: 91, ease: "out(2)" },
            { to: 1.4, duration: 572, ease: "out(2)" },
          ],
        },
        0,
      );

    // Five-colour star sparks — burst off the face on contact and fly out to their own vectors.
    stars.forEach((star) => {
      const dx = Number(star.dataset.dx || 0);
      const dy = Number(star.dataset.dy || 0);
      tl.add(
        star,
        {
          opacity: [
            { to: 0, duration: 611 },
            { to: 1, duration: 78, ease: "out(2)" },
            { to: 0, duration: 611, ease: "out(2)" },
          ],
          translateX: [
            { to: 0, duration: 611 },
            { to: dx * 0.45, duration: 78, ease: "out(2)" },
            { to: dx, duration: 611, ease: "out(1.6)" },
          ],
          translateY: [
            { to: 0, duration: 611 },
            { to: dy * 0.45, duration: 78, ease: "out(2)" },
            { to: dy, duration: 611, ease: "out(1.6)" },
          ],
          scale: [
            { to: 0.2, duration: 611 },
            { to: 1, duration: 78, ease: "out(2)" },
            { to: 0.5, duration: 611, ease: "out(2)" },
          ],
          rotate: [
            { to: 0, duration: 611 },
            { to: 35, duration: 78, ease: "out(2)" },
            { to: 70, duration: 611, ease: "out(2)" },
          ],
        },
        0,
      );
    });

    // Ember + the hammer-arm SVG dip together on the strike (both carry .forge-bob).
    tl.add(
      bob,
      {
        translateY: [
          { to: 2, duration: 598, ease: "inOut(2)" },
          { to: -3, duration: 208, ease: "out(2)" },
          { to: -3, duration: 494 },
        ],
      },
      0,
    );

    // Forge heat behind everything breathes on its own slower clock.
    const heat = animate(".forge-heat", { opacity: [0.85, 1, 0.85], duration: 4000, loop: true, ease: "inOut(2)" });

    void IMPACT;
    return () => {
      tl.revert();
      heat.revert();
    };
  }, []);

  return (
    <div ref={root} aria-hidden className={className}>
      {/* Forge heat behind everything */}
      <div className="forge-heat absolute inset-x-[5%] bottom-[8%] top-[20%] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,61,0.45),rgba(193,65,12,0.18)_55%,transparent_75%)] blur-2xl" />

      {/* Ember, standing at the anvil. forging = no built-in hammer/right arm; the overlay below
          supplies the swinging hammer and the moving arm so they don't double up. */}
      <div className="forge-bob absolute inset-x-[14%] top-[19%]">
        <Ember mood="happy" forging size={400} className="h-auto w-full drop-shadow-[0_20px_40px_rgba(255,120,40,0.35)]" title="Ember, the Mana Forge mascot, at the anvil" />
      </div>

      {/* The anvil (wobbles on each strike; overflow-visible so the sparks can fly up off it) */}
      <svg viewBox="0 0 400 170" className="forge-anvil overflow-visible absolute inset-x-0 bottom-0 h-auto w-full">
        <defs>
          <linearGradient id="anvilTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6b6f78" />
            <stop offset="0.25" stopColor="#3b3e45" />
            <stop offset="1" stopColor="#1d1e22" />
          </linearGradient>
          <linearGradient id="anvilBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c2d33" />
            <stop offset="1" stopColor="#121216" />
          </linearGradient>
          <linearGradient id="anvilRim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff8a3d" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffb347" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* face and horn */}
        <path d="M40 18 C 70 18, 92 22, 110 30 L 330 30 L 352 18 L 352 58 L 120 58 C 92 58, 62 46, 40 18 Z" fill="url(#anvilTop)" />
        <rect x="110" y="26" width="242" height="5" rx="2" fill="url(#anvilRim)" />
        {/* waist and base */}
        <path d="M150 58 L 300 58 L 282 108 L 168 108 Z" fill="url(#anvilBody)" />
        <path d="M120 108 L 330 108 L 352 150 L 98 150 Z" fill="url(#anvilBody)" />
        <rect x="90" y="150" width="270" height="12" rx="4" fill="#0d0d10" />
        {/* the strike glow on the face */}
        <ellipse className="forge-strike" cx="230" cy="30" rx="46" ry="7" fill="#ffd27a" />
        {/* puff of smoke on impact */}
        <g transform="translate(230 24)">
          <ellipse className="forge-smoke" cx="0" cy="0" rx="11" ry="7" fill="#cac7bd" />
        </g>
        {/* five-colour star sparks bursting off the strike */}
        {BURST.map((s, i) => (
          <g key={i} transform="translate(230 30)">
            <path className="forge-star" d={STAR_D} fill={s.c} data-dx={s.dx} data-dy={s.dy} />
          </g>
        ))}
      </svg>

      {/* Marker at the strike point (57%, 72% of the scene box) — ForgeSparks reads this to know
          where to throw the sparks from, so they always come off the anvil face. */}
      <span data-forge-strike className="absolute h-px w-px" style={{ left: "57%", top: "72%" }} />

      {/* Ember's forearm + the hammer she swings. Same box + viewBox as Ember, so the grip lands on
          her hand. .forge-arm pumps the whole arm about her shoulder; .forge-hammer snaps the wrist.
          Placed after the anvil so the head reads on top of the face when it lands. */}
      <div className="forge-bob absolute inset-x-[14%] top-[19%]">
        <svg viewBox="0 0 400 400" className="h-auto w-full overflow-visible">
          <g className="forge-arm">
            {/* flame forearm hanging from her shoulder down to the hand at waist height */}
            <path d="M286 252 Q 298 282 316 306" fill="none" stroke="#ff8a3d" strokeWidth="15" strokeLinecap="round" />
            <path d="M292 258 Q 302 284 314 302" fill="none" stroke="#ffb15a" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
            <g className="forge-hammer">
              <g transform="rotate(50 316 306)">
                {/* handle, running down from the hand at the waist */}
                <rect x="309" y="304" width="14" height="84" rx="7" fill="#7a4f27" />
                <rect x="313" y="306" width="3.5" height="80" rx="1.75" fill="#9c6c3a" />
                {/* steel head at the striking end (centred ~316,402 locally); squashes on impact */}
                <g className="forge-headhit">
                  <rect x="290" y="389" width="52" height="26" rx="6" fill="#565c67" />
                  <rect x="290" y="389" width="52" height="8" rx="4" fill="#79808d" />
                  <rect x="290" y="409" width="52" height="6" rx="3" fill="#383c44" />
                </g>
                {/* flame fist gripping the handle at the waist */}
                <circle cx="314" cy="296" r="14" fill="#ff8a3d" />
                <circle cx="316" cy="306" r="18" fill="#ff8a3d" />
                <circle cx="311" cy="302" r="7" fill="#ffc061" opacity="0.6" />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
