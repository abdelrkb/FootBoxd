import { config } from '../config.js';
import { RateLimiter, sleep } from './rate-limiter.js';

const rateLimiter = new RateLimiter(config.rateLimitPerMinute);

const MAX_RETRIES_ON_429 = 5;

async function fetchWithRateLimitAndBackoff(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES_ON_429; attempt++) {
    await rateLimiter.acquire();
    const res = await fetch(url, init);
    if (res.status !== 429) return res;

    // Doc TheSportsDB : 429 en cas de dépassement du plan Premium (100 req/min) — pas de
    // Retry-After documenté/observé, donc backoff exponentiel maison.
    const backoffMs = Math.min(2 ** attempt * 1000, 30_000);
    console.warn(`[sportsdb] 429 reçu, backoff ${backoffMs}ms (tentative ${attempt + 1}/${MAX_RETRIES_ON_429})`);
    await sleep(backoffMs);
  }
  throw new Error(`[sportsdb] Toujours 429 après ${MAX_RETRIES_ON_429} tentatives: ${url}`);
}

// v1 : utilisé uniquement pour eventsday.php (pas d'équivalent v2 pour "matchs d'un jour X",
// voir section 2 de architecture.md). Clé API dans le chemin, pas de header.
export async function fetchV1<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${config.sportsApiV1BaseUrl}/${config.sportsApiKey}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetchWithRateLimitAndBackoff(url.toString());
  if (!res.ok) {
    throw new Error(`[sportsdb v1] ${res.status} ${res.statusText} — ${url.pathname}`);
  }
  return res.json() as Promise<T>;
}

// v2 : à privilégier partout où possible (section 2). Auth via header X-API-KEY.
export async function fetchV2<T>(path: string): Promise<T> {
  const url = `${config.sportsApiV2BaseUrl}/${path}`;
  const res = await fetchWithRateLimitAndBackoff(url, {
    headers: { 'X-API-KEY': config.sportsApiKey },
  });
  if (!res.ok) {
    throw new Error(`[sportsdb v2] ${res.status} ${res.statusText} — ${path}`);
  }
  return res.json() as Promise<T>;
}
