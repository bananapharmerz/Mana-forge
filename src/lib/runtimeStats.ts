// How the server process is doing, for the admin runtime check: uptime, memory, and how long the
// event loop has been stuck. A stuck event loop is what makes every page (even /api/health) hang.
import { monitorEventLoopDelay, type IntervalHistogram } from "node:perf_hooks";

const g = globalThis as unknown as { __mfLoop?: { h: IntervalHistogram; worst: number; worstAt: number; startedAt: number } };

export function startRuntimeStats() {
  if (g.__mfLoop) return;
  const h = monitorEventLoopDelay({ resolution: 50 });
  h.enable();
  g.__mfLoop = { h, worst: 0, worstAt: 0, startedAt: Date.now() };
  // The histogram only says "how bad", so a 1s ticker remembers the single worst stall and when.
  let last = Date.now();
  const t = setInterval(() => {
    const now = Date.now();
    const lag = now - last - 1000;
    last = now;
    if (lag > g.__mfLoop!.worst) {
      g.__mfLoop!.worst = lag;
      g.__mfLoop!.worstAt = now;
    }
  }, 1000);
  t.unref?.();
}

export function runtimeStats() {
  const m = process.memoryUsage();
  const mb = (n: number) => Math.round(n / 1048576);
  const l = g.__mfLoop;
  return {
    uptimeMin: Math.round(process.uptime() / 60),
    memoryMb: { rss: mb(m.rss), heapUsed: mb(m.heapUsed), heapTotal: mb(m.heapTotal), external: mb(m.external) },
    eventLoopMs: l
      ? { p50: Math.round(l.h.percentile(50) / 1e6), p99: Math.round(l.h.percentile(99) / 1e6), max: Math.round(l.h.max / 1e6), worstStall: l.worst, worstStallAt: l.worstAt ? new Date(l.worstAt).toISOString() : null }
      : null,
  };
}
