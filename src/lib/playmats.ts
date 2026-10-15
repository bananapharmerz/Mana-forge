// Playmats: the board background a player picks for a deck. "default" keeps the built-in Forge mat
// (.arena-mat in globals.css); the five mana playmats layer a faint colour glow over a dark base so
// cards still read clearly on top. Preset-only (no custom uploads), so validation is a simple
// allow-list. Chosen per deck in the builder and applied to each player's battlefield in play.

export interface PlaymatStyle {
  id: string;
  label: string;
  // CSS `background` value; empty string means "use the default .arena-mat styling".
  background: string;
  // A small swatch colour for the picker chip.
  swatch: string;
}

export const PLAYMAT_STYLES: PlaymatStyle[] = [
  { id: "default", label: "Forge", background: "", swatch: "#2b2620" },
  {
    id: "mana-white",
    label: "White",
    background:
      "radial-gradient(120% 90% at 50% 0%, rgba(246,239,208,0.18), transparent 60%), linear-gradient(160deg, #3a3524 0%, #26230f 60%, #1a180b 100%)",
    swatch: "#cfc7a0",
  },
  {
    id: "mana-blue",
    label: "Blue",
    background:
      "radial-gradient(120% 90% at 50% 0%, rgba(73,163,224,0.22), transparent 60%), linear-gradient(160deg, #0c2742 0%, #08192c 60%, #050f1c 100%)",
    swatch: "#0e68ab",
  },
  {
    id: "mana-black",
    label: "Black",
    background:
      "radial-gradient(120% 90% at 50% 0%, rgba(154,115,214,0.20), transparent 60%), linear-gradient(160deg, #221b2c 0%, #140f1c 60%, #0a0710 100%)",
    swatch: "#5a4a6e",
  },
  {
    id: "mana-red",
    label: "Red",
    background:
      "radial-gradient(120% 90% at 50% 0%, rgba(255,90,60,0.20), transparent 60%), linear-gradient(160deg, #3a140d 0%, #260b07 60%, #190604 100%)",
    swatch: "#a3261c",
  },
  {
    id: "mana-green",
    label: "Green",
    background:
      "radial-gradient(120% 90% at 50% 0%, rgba(73,181,106,0.20), transparent 60%), linear-gradient(160deg, #12331f 0%, #0c2114 60%, #07160d 100%)",
    swatch: "#1d7a44",
  },
];

export const PLAYMAT_IDS = PLAYMAT_STYLES.map((s) => s.id);

// The CSS `background` for a stored playmat value. A preset id → its gradient; a custom uploaded
// image (data URL) or an https image URL → that image, cover-fitted; the default → "" so the
// built-in .arena-mat styling shows through.
export function resolvePlaymat(value?: string | null): string {
  if (value && (value.startsWith("data:") || value.startsWith("http"))) {
    return `url("${value}") center / cover no-repeat`;
  }
  return PLAYMAT_STYLES.find((s) => s.id === value)?.background ?? "";
}

// Validate a value coming from a client request: a known preset id, a small uploaded image
// (data URL, ~6 MB cap) or an https image URL, else undefined.
export function cleanPlaymat(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (PLAYMAT_IDS.includes(value)) return value;
  if (value.startsWith("data:image/") && value.length <= 8_000_000) return value;
  if (/^https:\/\/\S+$/.test(value) && value.length <= 2000) return value;
  return undefined;
}
