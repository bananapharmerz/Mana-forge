import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Counts page requests per day, split into browsers and bots (search crawlers, scripts,
// monitors, headless browsers), by user agent. No IPs and nothing per person: just totals.
// Real people are counted separately from the analytics beacon (only real browsers run it).
// Kept in memory and written to /data/traffic.json every minute and on shutdown; 60 days are kept.

export interface TrafficDay {
  pages: number; // page requests (not API, not static files)
  bots: number; // of those, from bots
  by: Record<string, number>; // bot name -> requests
}

const BOTS: [RegExp, string][] = [
  [/googlebot|google-inspectiontool|adsbot-google|mediapartners-google|googleother|google-extended/i, "Google"],
  [/bingbot|bingpreview|msnbot/i, "Bing"],
  [/duckduckbot|duckassistbot/i, "DuckDuckGo"],
  [/yandex/i, "Yandex"],
  [/baiduspider/i, "Baidu"],
  [/applebot/i, "Apple"],
  [/facebookexternalhit|meta-externalagent|facebot/i, "Meta"],
  [/twitterbot|discordbot|slackbot|telegrambot|whatsapp|linkedinbot|redditbot|pinterest/i, "Link previews"],
  [/gptbot|chatgpt|oai-searchbot|claudebot|claude-web|anthropic|perplexity|ccbot|bytespider|amazonbot|cohere/i, "AI crawlers"],
  [/ahrefs|semrush|mj12bot|dotbot|petalbot|seznam|dataforseo|serpstat|blexbot/i, "SEO crawlers"],
  [/uptime|pingdom|statuscake|monitor|cloudflare-healthchecks|better ?stack|nexus/i, "Monitors"],
  [/headless|phantomjs|puppeteer|playwright|selenium|lighthouse/i, "Headless browsers"],
  [/curl|wget|python|go-http|java\/|okhttp|axios|node-fetch|undici|libwww|httpclient|scrapy|postman/i, "Scripts"],
  [/bot\b|crawler|spider|crawl|slurp|scan/i, "Other bots"],
];

export function botName(ua: string | null): string | null {
  if (!ua || ua.length < 12) return "Scripts";
  for (const [re, name] of BOTS) if (re.test(ua)) return name;
  return null;
}

const KEEP_DAYS = 60;
const file = () => path.join(path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db")), "traffic.json");
const g = globalThis as unknown as { __mfTraffic?: { days: Record<string, TrafficDay>; dirty: boolean; timer?: ReturnType<typeof setInterval> } };

function state() {
  if (!g.__mfTraffic) {
    let days: Record<string, TrafficDay> = {};
    try {
      days = JSON.parse(readFileSync(file(), "utf8")).days ?? {};
    } catch {}
    g.__mfTraffic = { days, dirty: false };
    g.__mfTraffic.timer = setInterval(flush, 60 * 1000);
    g.__mfTraffic.timer.unref?.();
    // A deploy stops the old container: save the counts first so nothing is lost.
    // If nothing else handles the signal, exit as Node normally would.
    for (const sig of ["SIGTERM", "SIGINT"] as const)
      process.once(sig, () => {
        flush();
        if (process.listenerCount(sig) === 0) process.exit(0);
      });
    process.once("beforeExit", flush);
  }
  return g.__mfTraffic;
}

function flush() {
  const s = g.__mfTraffic;
  if (!s?.dirty) return;
  const keys = Object.keys(s.days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete s.days[k];
  try {
    writeFileSync(file(), JSON.stringify({ days: s.days }));
    s.dirty = false;
  } catch {}
}

/** Called for each page request (from src/proxy.ts). Cheap: two counters in memory. */
export function countPage(ua: string | null) {
  const s = state();
  const day = new Date().toISOString().slice(0, 10);
  const d = (s.days[day] ??= { pages: 0, bots: 0, by: {} });
  d.pages++;
  const bot = botName(ua);
  if (bot) {
    d.bots++;
    d.by[bot] = (d.by[bot] ?? 0) + 1;
  }
  s.dirty = true;
}

export function trafficDays(n = 7): { day: string; pages: number; bots: number; by: Record<string, number> }[] {
  const s = state();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ day, ...(s.days[day] ?? { pages: 0, bots: 0, by: {} }) });
  }
  return out;
}
