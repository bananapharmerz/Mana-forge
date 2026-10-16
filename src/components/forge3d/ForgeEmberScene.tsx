import type { CSSProperties } from "react";

// Mana Forge homepage hero: Ember hammering the anvil, built from the painted mascot art
// (public/ember/ember_hammer_*.png) with a looping CSS animation. Pure CSS so it's SSR-safe and
// respects reduced-motion. Replaces the old hand-built SVG forge scene.
const SPARKS: { dx: string; dy: string }[] = [
  { dx: "60px", dy: "-72px" },
  { dx: "95px", dy: "-34px" },
  { dx: "40px", dy: "-96px" },
  { dx: "112px", dy: "-54px" },
  { dx: "72px", dy: "-116px" },
  { dx: "128px", dy: "-84px" },
];

export default function ForgeEmberScene({ className = "relative" }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="mf-forge">
        <div className="mf-forge-heat" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mf-ham mf-ham-up" src="/ember/ember_hammer_up.png" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mf-ham mf-ham-down" src="/ember/ember_hammer_down.png" alt="" />
        <div className="mf-forge-flash" />
        {SPARKS.map((s, i) => (
          <span key={i} className="mf-forge-spark" style={{ "--dx": s.dx, "--dy": s.dy } as CSSProperties} />
        ))}
      </div>
      <style>{`
        .mf-forge{position:absolute;inset:0;overflow:visible;transform-origin:50% 90%;animation:mfBob 1.3s ease-in-out infinite}
        .mf-forge-heat{position:absolute;left:8%;right:8%;top:14%;bottom:6%;border-radius:999px;
          background:radial-gradient(closest-side,rgba(255,138,61,.45),rgba(193,65,12,.18) 55%,transparent 75%);
          filter:blur(28px);animation:mfHeat 4s ease-in-out infinite}
        .mf-ham{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform-origin:50% 90%;
          filter:drop-shadow(0 20px 40px rgba(255,120,40,.35))}
        .mf-ham-up{animation:mfUp 1.3s steps(1,end) infinite, mfWind 1.3s ease-in-out infinite}
        .mf-ham-down{opacity:0;animation:mfDown 1.3s steps(1,end) infinite}
        .mf-forge-flash{position:absolute;left:46%;top:58%;width:40%;height:40%;border-radius:50%;
          background:radial-gradient(circle,rgba(255,240,200,.9),rgba(255,160,45,.5) 34%,transparent 70%);
          opacity:0;animation:mfFlash 1.3s ease-out infinite}
        .mf-forge-spark{position:absolute;left:60%;top:72%;width:9px;height:9px;border-radius:50%;
          background:#ffc24a;opacity:0;animation:mfSpark 1.3s ease-out infinite}
        @keyframes mfHeat{0%,100%{opacity:.85}50%{opacity:1}}
        @keyframes mfUp{0%,30%{opacity:1}31%,46%{opacity:0}47%,100%{opacity:1}}
        @keyframes mfDown{0%,30%{opacity:0}31%,46%{opacity:1}47%,100%{opacity:0}}
        @keyframes mfWind{0%{transform:rotate(0) translateY(0)}24%{transform:rotate(-3deg) translateY(-6px)}31%{transform:rotate(1deg) translateY(2px)}100%{transform:rotate(0) translateY(0)}}
        @keyframes mfBob{0%,30%{transform:translate(0,0)}33%{transform:translate(-2%,1.2%)}37%{transform:translate(1.5%,-.6%)}42%{transform:translate(-1%,.4%)}48%{transform:translate(0,0)}100%{transform:translate(0,0)}}
        @keyframes mfFlash{0%,30%{opacity:0;transform:scale(.6)}33%{opacity:1;transform:scale(1.05)}50%{opacity:0;transform:scale(1.3)}100%{opacity:0}}
        @keyframes mfSpark{0%,30%{opacity:0;transform:translate(0,0)}33%{opacity:1}55%{opacity:0;transform:translate(var(--dx),var(--dy))}100%{opacity:0}}
        @media (prefers-reduced-motion: reduce){
          .mf-ham-up,.mf-ham-down,.mf-forge,.mf-forge-flash,.mf-forge-spark,.mf-forge-heat{animation:none}
          .mf-ham-down,.mf-forge-flash,.mf-forge-spark{opacity:0}
        }
      `}</style>
    </div>
  );
}
