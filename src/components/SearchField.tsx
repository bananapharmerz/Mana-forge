"use client";

import { useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";

// Shared look for search boxes: a visible edge, a magnifier inside and a clear (X) once you type.
// The faint 1.5:1 border made them look like decoration, so people missed them.
export const searchFieldClass =
  "search-field w-full rounded-md border border-input-border bg-surface py-2 pl-9 pr-9 text-foreground placeholder:text-muted focus:border-gold focus:outline-none";

export function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M13 13l4 4" />
    </svg>
  );
}

export function ClearButton({ onClear }: { onClear: () => void }): ReactNode {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label="Clear search"
      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-foreground focus:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
        <path d="M5 5l10 10M15 5L5 15" />
      </svg>
    </button>
  );
}

/**
 * An uncontrolled search input for plain GET forms: it still submits with the form without
 * JavaScript; the X only clears the text in the browser.
 */
export default function SearchField({
  className = "",
  wrapperClassName = "",
  defaultValue,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue"> & {
  defaultValue?: string;
  wrapperClassName?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [hasText, setHasText] = useState(Boolean(defaultValue));

  return (
    <div className={`relative ${wrapperClassName}`}>
      <SearchIcon />
      <input
        {...props}
        ref={ref}
        defaultValue={defaultValue}
        onInput={(e) => {
          setHasText(e.currentTarget.value.length > 0);
          props.onInput?.(e);
        }}
        className={`${searchFieldClass} ${className}`}
      />
      {hasText && (
        <ClearButton
          onClear={() => {
            if (!ref.current) return;
            ref.current.value = "";
            setHasText(false);
            ref.current.focus();
          }}
        />
      )}
    </div>
  );
}
