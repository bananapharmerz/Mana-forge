"use client";

import { useState } from "react";
import CardBack, { CARD_BACK_STYLES, resolveCardBack } from "./CardBack";

const MAX_CUSTOM_BACK_BYTES = 5 * 1024 * 1024;

export default function CardBackPicker({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (next: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const current = resolveCardBack(value);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_CUSTOM_BACK_BYTES) {
      setError("Image is too large — please use one under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="card-frame p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Card Back</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {CARD_BACK_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => onChange(style.id)}
            className={`flex flex-col items-center gap-1 rounded-md border-2 p-1 ${
              current.id === style.id ? "border-gold" : "border-transparent hover:border-border"
            }`}
          >
            <CardBack value={style.id} className="w-full" />
            <span className="text-[9px] text-muted">{style.label}</span>
          </button>
        ))}
        <label
          className={`flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 p-1 ${
            current.id === "custom" ? "border-gold" : "border-transparent hover:border-border"
          }`}
        >
          {current.id === "custom" ? (
            <CardBack value={value} className="w-full" />
          ) : (
            <div
              className="flex w-full items-center justify-center rounded-md border border-dashed border-border text-[9px] text-muted"
              style={{ aspectRatio: "2.5 / 3.5" }}
            >
              Upload
            </div>
          )}
          <span className="text-[9px] text-muted">Custom Art</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
