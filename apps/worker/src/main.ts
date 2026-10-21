import { config } from './config.js';
import { syncSchedule } from './sync/schedule-sync.js';
import { syncLiveScores } from './sync/live-sync.js';
import { syncLineups } from './sync/lineup-sync.js';
import { syncMatchEvents } from './sync/events-sync.js';
import { syncKickoffReminders } from './sync/kickoff-reminders.js';
import { syncStandings } from './sync/standings-sync.js';
import { syncSquads } from './sync/squad-sync.js';
import { syncNextFixtures } from './sync/next-fixtures-sync.js';

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
    // Purement local (aucun appel TheSportsDB) — intervalle court pour rester précis sur la
    // fenêtre de rappel de 30 min.
    runLoop('kickoff-reminders', syncKickoffReminders, 60_000),
    // Page équipe (issue #7) : classement resynchronisé seulement pour les ligues avec un
    // match en direct ou récemment terminé (voir standings-sync.ts), jamais toutes les ligues.
    runLoop('standings-sync', syncStandings, 120_000),
    // Petit lot à chaque tick (voir squad-sync.ts) — budget API négligeable, pas besoin d'un
    // intervalle court.
    runLoop('squad-sync', syncSquads, 300_000),
    // Page équipe : complète le calendrier au-delà de la fenêtre de 5 jours de schedule-sync
    // (voir next-fixtures-sync.ts). Tick plus court que squad-sync (60s vs 300s) : ce sync est
    // maintenant piloté par la consultation réelle d'une page équipe (nextFixturesRequestedAt),
    // un tick lent retarderait inutilement l'effet visible d'une visite.
    runLoop('next-fixtures-sync', syncNextFixtures, 60_000),
  ]);
}

await bootstrap();
