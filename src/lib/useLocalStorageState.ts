"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// State that lives in localStorage (the cart, the proxy project). Reading it through
// useSyncExternalStore renders the server-safe fallback first and the saved value right after
// hydration, without a setState-in-effect, and keeps every open tab in sync.

const EVENT = "mtg-hub:local-storage";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Pass a constant (module-level) fallback so it stays the same object between renders.
export function useLocalStorageState<T>(key: string, fallback: T): [T, (update: T | ((prev: T) => T)) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );
  const value = useMemo<T>(() => {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback; // ignore corrupt saved data
    }
  }, [raw, fallback]);

  const setValue = useCallback(
    (update: T | ((prev: T) => T)) => {
      const current = (() => {
        const r = read(key);
        if (r === null) return fallback;
        try {
          return JSON.parse(r) as T;
        } catch {
          return fallback;
        }
      })();
      const next = typeof update === "function" ? (update as (prev: T) => T)(current) : update;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // storage full or blocked: nothing we can do
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key, fallback]
  );

  return [value, setValue];
}
