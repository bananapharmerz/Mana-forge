import { SITE } from "./site";

// IndexNow lets us tell Bing/Yandex/Seznam (and, increasingly, others) the moment a URL is new or
// changed, instead of waiting for them to re-crawl the sitemap. The key is NOT a secret — it's
// published at /<key>.txt so the search engines can verify we own the host. Override with env
// INDEXNOW_KEY only if you also rename the public key file to match.
export const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || "25f190ec9c04d6a3c2519a5a722e9a7c").trim();

const ENDPOINT = "https://api.indexnow.org/indexnow";

function host(): string | null {
  try {
    return new URL(SITE.url).host;
  } catch {
    return null;
  }
}

// True only for a real, public https host — never localhost or a bare IP, where a ping is pointless
// (and would just be rejected). Lets callers no-op safely in dev.
export function indexNowEnabled(): boolean {
  const h = host();
  return (
    INDEXNOW_KEY.length >= 8 &&
    SITE.url.startsWith("https://") &&
    !!h &&
    h !== "localhost" &&
    !h.startsWith("localhost:") &&
    !/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(h)
  );
}

export interface IndexNowResult {
  ok: boolean;
  submitted: number;
  status?: number;
  skipped?: boolean;
  error?: string;
}

// Submit a batch of absolute, same-host URLs to IndexNow. Dedupes, drops off-host/invalid URLs,
// and caps at IndexNow's 10,000-per-request limit. Never throws — returns a small result object.
export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  const h = host();
  if (!indexNowEnabled() || !h) return { ok: false, submitted: 0, skipped: true };

  const clean = Array.from(
    new Set(
      urls
        .map((u) => u.trim())
        .filter((u) => {
          try {
            return new URL(u).host === h;
          } catch {
            return false;
          }
        })
    )
  ).slice(0, 10000);
  if (!clean.length) return { ok: true, submitted: 0 };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: h,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE.url}/${INDEXNOW_KEY}.txt`,
        urlList: clean,
      }),
    });
    // IndexNow returns 200 or 202 on success; 4xx tells us something's wrong with the key/host.
    return { ok: res.ok, submitted: clean.length, status: res.status };
  } catch (e) {
    return { ok: false, submitted: 0, error: e instanceof Error ? e.message : "fetch failed" };
  }
}
