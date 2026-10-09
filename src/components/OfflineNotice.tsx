"use client";

import { useEffect, useState } from "react";

/** A thin bar when the connection drops, so a save that can't go through isn't a mystery. */
export default function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[150] bg-[#7a2a12] px-4 py-1.5 text-center text-xs font-semibold text-[#fff1e0]">
      You&apos;re offline. Changes you make now may not save until your connection is back.
    </div>
  );
}
