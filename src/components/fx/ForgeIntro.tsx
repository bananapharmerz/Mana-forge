// A one-second "forge ignites" intro on the first page load of a visit. It's plain markup
// and CSS (see .forge-intro in globals.css), so it shows before any JavaScript runs; a tiny
// script in <head> hides it for the rest of the visit, and reduced-motion users never see it.

export const INTRO_SCRIPT = `document.documentElement.classList.add("js");try{if(sessionStorage.getItem("mf:intro")){document.documentElement.dataset.introSeen="1"}else{sessionStorage.setItem("mf:intro","1")}}catch(e){}`;
import { SITE } from "@/lib/site";

export default function ForgeIntro() {
  return (
    <div className="forge-intro" aria-hidden>
      <svg viewBox="-110 -110 220 220" className="forge-intro-sigil">
        <defs>
          <linearGradient id="fi-flame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff4d1a" />
            <stop offset="0.5" stopColor="#ffb020" />
            <stop offset="1" stopColor="#fff7d1" />
          </linearGradient>
        </defs>
        <circle r="96" fill="none" stroke="#e0b252" strokeWidth="2" className="forge-intro-ring" />
        <g transform="translate(0 22)">
          <path
            d="M-60 0 L60 0 Q52 16 30 18 L18 18 L26 44 L-26 44 L-18 18 L-44 18 Q-78 14 -92 -2 Q-70 0 -60 0 Z M-40 44 h80 v10 h-80 Z"
            fill="#e0b252"
          />
          <path
            className="forge-intro-flame"
            d="M0 -8 C-34 -22 -22 -58 -6 -76 C-8 -58 6 -52 4 -38 C14 -48 18 -64 12 -92 C40 -62 38 -24 0 -8 Z"
            fill="url(#fi-flame)"
          />
        </g>
      </svg>
      <div className="forge-intro-word">{SITE.upper}</div>
    </div>
  );
}
