import { prisma } from '@football-app/database';
import { fetchV2 } from '../sportsdb/http.js';
import type { EventLineupResponse } from '../sportsdb/types.js';

const LINEUP_WINDOW_BEFORE_MS = 2 * 60 * 60_000; // 2h avant le coup d'envoi
const LINEUP_WINDOW_AFTER_MS = 3 * 60 * 60_000; // jusqu'à 3h après (rattrapage si absent avant)

// "1 fois avant le match (si dispo), refresh si absent" (section 2) : on retente tant que
// `lineups` est null et qu'on est dans la fenêtre autour du coup d'envoi.
export async function syncLineups(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - LINEUP_WINDOW_AFTER_MS);
  const windowEnd = new Date(now.getTime() + LINEUP_WINDOW_BEFORE_MS);

  const candidates = await prisma.match.findMany({
    where: {
      lineups: { equals: undefined },
      kickoffAt: { gte: windowStart, lte: windowEnd },
      status: { in: ['scheduled', 'live', 'finished'] },
    },
  });
  const withoutLineups = candidates.filter((m) => m.lineups === null);

  console.log(`[lineup-sync] ${withoutLineups.length} match(s) à vérifier`);

  for (const match of withoutLineups) {
    try {
      const response = await fetchV2<EventLineupResponse>(`lookup/event_lineup/${match.externalId}`);
      const rows = response.lookup ?? [];
      if (rows.length === 0) continue; // pas encore dispo, on retentera au prochain cycle

      await prisma.match.update({
        where: { id: match.id },
        data: { lineups: rows as unknown as object },
      });
    } catch (err) {
      console.error(`[lineup-sync] échec pour le match ${match.externalId}:`, err);
    }
  }
}
