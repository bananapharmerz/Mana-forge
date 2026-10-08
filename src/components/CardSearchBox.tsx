"use client";

import { useEffect, useRef, useState } from "react";

export default function CardSearchBox({
  placeholder,
  fetchSuggestions,
  onSelect,
  clearOnSelect = true,
}: {
  placeholder: string;
  fetchSuggestions: (query: string) => Promise<string[]>;
  onSelect: (name: string) => void;
  clearOnSelect?: boolean;
}) {
  const [value, setValue] = useState("");
  const [fetched, setSuggestions] = useState<string[]>([]);
  const suggestions = value.trim() ? fetched : [];
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) return;
    timer.current = setTimeout(async () => {
      const results = await fetchSuggestions(value);
      setSuggestions(results);
      setOpen(true);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function pick(name: string) {
    onSelect(name);
    setOpen(false);
    setSuggestions([]);
    if (clearOnSelect) setValue("");
    else setValue(name);
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && suggestions[0]) {
            e.preventDefault();
            pick(suggestions[0]);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface-raised shadow-lg">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => pick(name)}
                className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-gold hover:text-black"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
