function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  sportsApiKey: requireEnv('SPORTS_API_KEY'),
  sportsApiV1BaseUrl: process.env.SPORTS_API_V1_BASE_URL ?? 'https://www.thesportsdb.com/api/v1/json',
  sportsApiV2BaseUrl: process.env.SPORTS_API_V2_BASE_URL ?? 'https://www.thesportsdb.com/api/v2/json',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  // Rate limit du plan Premium TheSportsDB : 100 req/min (section 2 de architecture.md)
  rateLimitPerMinute: 100,
  liveSyncIntervalMs: 75_000, // ~60-90s (section 2)
  scheduleSyncIntervalMs: 12 * 60_000, // ~10-15 min (section 2)
  lineupSyncIntervalMs: 10 * 60_000,
  calendarDaysAhead: 5, // "+5 jours" (section 7, écran Accueil)
};
