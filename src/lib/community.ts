// Shared bits for the community features: polls (/vote) and the monthly Forge Challenge (/challenge).

export interface PollOption {
  id: string;
  label: string;
}

export function pollOptions(raw: string): PollOption[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter((o): o is PollOption => !!o && typeof o === "object" && typeof (o as PollOption).id === "string" && typeof (o as PollOption).label === "string")
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function idList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

export type ChallengePhase = "submitting" | "judging" | "voting" | "done";

/**
 * Where a challenge is: taking entries until `submitUntil`, then the admin picks finalists
 * ("judging"), then members vote until `voteUntil`, then it's done. If no finalists were picked
 * by the time voting would end, it stays in judging until they are.
 */
export function challengePhase(c: { submitUntil: Date; voteUntil: Date; finalists: string | null }, now = Date.now()): ChallengePhase {
  if (now < c.submitUntil.getTime()) return "submitting";
  if (!idList(c.finalists).length) return "judging";
  if (now < c.voteUntil.getTime()) return "voting";
  return "done";
}

export const fmtDate = (d: Date) => d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
export const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });

export const SLUG = /^[a-z0-9][a-z0-9-]{1,60}$/;
