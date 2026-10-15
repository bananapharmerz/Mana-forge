"use client";

import { useState } from "react";
import { PLAYMAT_STYLES } from "@/lib/playmats";

const MAX_CUSTOM_MAT_BYTES = 5 * 1024 * 1024;

function isCustom(value?: string | null): value is string {
  return !!value && (value.startsWith("data:") || value.startsWith("http"));
}

export default function PlaymatPicker({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (next: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const custom = isCustom(value);
  const current = custom ? "custom" : value && PLAYMAT_STYLES.some((s) => s.id === value) ? value : "default";

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_CUSTOM_MAT_BYTES) {
      setError("Image is too large — please use one under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="card-frame p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Playmat</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {PLAYMAT_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => onChange(style.id)}
            className={`flex flex-col items-center gap-1 rounded-md border-2 p-1 ${
              current === style.id ? "border-gold" : "border-transparent hover:border-border"
            }`}
          >
            <div
              className="w-full rounded-md border border-border"
              style={{
                aspectRatio: "16 / 10",
                background: style.background || "linear-gradient(160deg, #2b2620 0%, #221e18 55%, #1c1812 100%)",
              }}
            />
            <span className="text-[9px] text-muted">{style.label}</span>
          </button>
        ))}
        <label
          className={`flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 p-1 ${
            current === "custom" ? "border-gold" : "border-transparent hover:border-border"
          }`}
        >
          {custom ? (
            <div
              className="w-full rounded-md border border-border"
              style={{ aspectRatio: "16 / 10", background: `url("${value}") center / cover no-repeat` }}
            />
          ) : (
            <div
              className="flex w-full items-center justify-center rounded-md border border-dashed border-border text-[9px] text-muted"
              style={{ aspectRatio: "16 / 10" }}
            >
              Upload
            </div>
          )}
          <span className="text-[9px] text-muted">Custom Image</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
    </div>
  );
}
