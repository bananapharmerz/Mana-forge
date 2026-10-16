import { packRipLimitFor, GUEST_PACK_RIPS } from "./tier";

export const GUEST_RIP_COOKIE = "mf_guest_rips";

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

// Guests get a small daily allowance tracked in a cookie (no account, nothing saved). The cookie
// value is "YYYY-MM-DD:count"; a stale date resets the count to a full allowance.
export function parseGuestRips(value: string | undefined | null): { date: string; count: number } {
  const today = todayUtc();
  if (!value) return { date: today, count: 0 };
  const [date, countRaw] = value.split(":");
  if (date !== today) return { date: today, count: 0 };
  const count = Number.parseInt(countRaw, 10);
  return { date: today, count: Number.isFinite(count) && count > 0 ? count : 0 };
}

export function guestRipStatus(value: string | undefined | null): { limit: number; used: number; left: number } {
  const { count } = parseGuestRips(value);
  return { limit: GUEST_PACK_RIPS, used: count, left: Math.max(0, GUEST_PACK_RIPS - count) };
}

export function serializeGuestRips(count: number): string {
  return `${todayUtc()}:${count}`;
}
