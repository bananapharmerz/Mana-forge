import { packRipLimitFor } from "./tier";

// The daily rip allowance is keyed to the UTC day; packRipsToday only counts if packRipsDate is
// today, otherwise the member is back to a full allowance.
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export interface RipUser {
  tier: string;
  packRipsDate: string | null;
  packRipsToday: number;
}

export function ripStatus(user: RipUser): { limit: number; used: number; left: number; tier: string } {
  const limit = packRipLimitFor(user.tier);
  const used = user.packRipsDate === todayUtc() ? user.packRipsToday : 0;
  return { limit, used, left: Math.max(0, limit - used), tier: user.tier };
}
