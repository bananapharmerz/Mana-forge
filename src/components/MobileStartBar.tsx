"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Phones only: once the hero's button has scrolled away, keep "Start building" one tap away at the
// bottom of the screen. Hides again near the footer so it never covers the legal links.
export default function MobileStartBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 260;
      setShow(window.scrollY > 640 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#e0b252]/30 bg-[#09060f]/92 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur transition-transform duration-300 md:hidden ${show ? "translate-y-0" : "translate-y-full"}`}
      aria-hidden={!show}
    >
      <Link
        href="/deck-builder"
        tabIndex={show ? 0 : -1}
        data-track="mobile bar: start building"
        className="block w-full rounded-lg bg-gradient-to-b from-[#f0c76a] to-[#c9973a] py-3 text-center text-base font-semibold text-[#1b130b] shadow-[0_8px_24px_-10px_rgba(224,178,82,0.8)]"
      >
        Start building, it&apos;s free
      </Link>
    </div>
  );
}
