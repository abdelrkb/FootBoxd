import { config } from './config.js';
import { syncSchedule } from './sync/schedule-sync.js';
import { syncLiveScores } from './sync/live-sync.js';
import { syncLineups } from './sync/lineup-sync.js';
import { syncMatchEvents } from './sync/events-sync.js';

async function runLoop(name: string, fn: () => Promise<void>, intervalMs: number) {
  const tick = async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[${name}] erreur non interceptée:`, err);
    }
  };
  await tick();
  setInterval(tick, intervalMs);
}

async function bootstrap() {
  console.log('[worker] démarrage du polling TheSportsDB');
  await Promise.all([
    runLoop('schedule-sync', syncSchedule, config.scheduleSyncIntervalMs),
    runLoop('live-sync', syncLiveScores, config.liveSyncIntervalMs),
    runLoop('lineup-sync', syncLineups, config.lineupSyncIntervalMs),
    // 1 appel par match live/récemment terminé (pas d'endpoint bulk) — intervalle plus long
    // que live-sync pour ménager le budget de 100 req/min partagé (section 2).
    runLoop('events-sync', syncMatchEvents, 120_000),
  ]);
}

await bootstrap();
