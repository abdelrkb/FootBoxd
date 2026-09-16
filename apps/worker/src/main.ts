import { config } from './config.js';
import { syncSchedule } from './sync/schedule-sync.js';
import { syncLiveScores } from './sync/live-sync.js';
import { syncLineups } from './sync/lineup-sync.js';

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
  ]);
}

await bootstrap();
