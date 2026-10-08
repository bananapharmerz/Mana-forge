// Every MTG mechanic that lets a card share the command zone with a second commander. Detection
// reads Scryfall's own `keywords` array (reliable, exact strings) with oracle text as a fallback
// for anything not yet keyword-tagged. Real examples pulled from Scryfall, 2026-08:
//   - Partner                    → keywords: ["Partner"]
//   - Partner with [Name]        → keywords: ["Partner with", "Partner"], oracle: "Partner with X"
//   - Friends forever             → keywords: ["Partner"], oracle: "Partner—Friends forever"
//   - Choose a Background        → keywords: ["Choose a background"]
//   - Doctor's companion (WHO)   → keywords: ["Doctor's companion"] — NOT tagged "Partner"
export function hasSecondCommanderMechanic(card: {
  keywords?: string[];
  oracle_text?: string;
}): boolean {
  const text = `${(card.keywords ?? []).join(" ")} ${card.oracle_text ?? ""}`.toLowerCase();
  return (
    /partner/.test(text) ||
    /friends forever/.test(text) ||
    /choose a background/.test(text) ||
    /doctor.s companion/.test(text)
  );
}

// Pairings where the player chooses the second commander themselves (there's no single named
// partner), and what the second card has to be. "Partner with X" isn't here — it names one card.
export type PartnerKind =
  | "partner"
  | "friends-forever"
  | "choose-background"
  | "background"
  | "doctors-companion"
  | "doctor";

export const PARTNER_PICK_PROMPT: Record<PartnerKind, string> = {
  partner: "Pick a partner (any other Partner commander)",
  "friends-forever": "Pick a Friends forever partner",
  "choose-background": "Pick a Background",
  background: "Pick a commander that can choose this Background",
  "doctors-companion": "Pick a Doctor",
  doctor: "Pick a Doctor's companion",
};

export function partnerKindOf(card: {
  keywords?: string[];
  oracle_text?: string;
  type_line?: string;
  card_faces?: { oracle_text?: string }[];
}): PartnerKind | null {
  if (extractPartnerWithName(card)) return null;
  const text = `${(card.keywords ?? []).join(" ")} ${card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? ""}`.toLowerCase();
  const type = card.type_line ?? "";
  if (/time lord doctor/i.test(type)) return "doctor";
  if (/doctor.s companion/.test(text)) return "doctors-companion";
  if (/friends forever/.test(text)) return "friends-forever";
  if (/choose a background/.test(text)) return "choose-background";
  if (/\bbackground\b/i.test(type)) return "background";
  if (/partner/.test(text)) return "partner";
  return null;
}

// Scryfall query for every card that can legally be the *other* half of a pairing of this kind.
export function partnerCandidateQuery(kind: PartnerKind): string {
  switch (kind) {
    case "partner":
      return 'is:commander keyword:partner -o:"partner with" -o:"friends forever" -keyword:"doctor\'s companion"';
    case "friends-forever":
      return 'is:commander o:"friends forever"';
    case "choose-background":
      return "is:commander t:background";
    case "background":
      return 'is:commander keyword:"choose a background"';
    case "doctors-companion":
      return 'is:commander t:"time lord doctor"';
    case "doctor":
      return 'is:commander keyword:"doctor\'s companion"';
  }
}

// "Partner with X" names one exact card, unlike plain Partner/Friends forever/Doctor's companion
// (any eligible card works) — oracle text reads "Partner with Rory Williams (When this creature
// enters, ...)", so the name is everything between "Partner with " and the reminder-text "(".
export function extractPartnerWithName(card: {
  oracle_text?: string;
  card_faces?: { oracle_text?: string }[];
}): string | null {
  const text = card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? "";
  const match = text.match(/Partner with ([^(\n]+)/);
  return match ? match[1].trim() : null;
}
