import { prisma } from '@football-app/database';
import { fetchV1 } from '../sportsdb/http.js';
import type { EventsDayResponse } from '../sportsdb/types.js';
import { upsertMatchFromScheduleEvent } from './upsert.js';

// Page équipe (issue #7, 2026-10-20 → complété le 2026-10-21) : le schedule-sync global
// (eventsday.php) ne couvre que les 5 prochains jours (section 2, architecture.md) — une page
// équipe affichait donc souvent très peu de matchs à venir, même quand l'équipe en a (coupes,
// matchs espacés dans le calendrier). `eventsnext.php?id=` renvoie les 10 prochains matchs
// toutes compétitions confondues, sans cette limite de fenêtre — vérifié en réel le 2026-10-21.
//
// Avec ~7000 équipes en base et un lot de 5 par tick, un sync purement par ancienneté (comme
// squad-sync) pouvait laisser une équipe jamais vue des jours dans la file sans jamais être
// choisie, y compris une équipe consultée À L'INSTANT par un utilisateur (observé en réel :
// Real Madrid toujours à 2 matchs après plusieurs ticks). On priorise donc d'abord les équipes
// marquées `nextFixturesRequestedAt` par TeamsService.getOverview (page équipe consultée), puis
// on complète le lot par ancienneté comme avant pour continuer à couvrir le reste avec le temps.
const BATCH_SIZE = 5;
const STALE_AFTER_MS = 24 * 60 * 60_000;

async function pickBatch(): Promise<{ id: string; externalId: string }[]> {
  const requested = await prisma.team.findMany({
    where: { nextFixturesRequestedAt: { not: null } },
    orderBy: { nextFixturesRequestedAt: 'desc' },
    take: BATCH_SIZE,
    select: { id: true, externalId: true },
  });

  if (requested.length >= BATCH_SIZE) return requested;

  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);
  const fallback = await prisma.team.findMany({
    where: {
      id: { notIn: requested.map((t) => t.id) },
      OR: [{ nextFixturesSyncedAt: null }, { nextFixturesSyncedAt: { lt: staleBefore } }],
    },
    orderBy: [{ nextFixturesSyncedAt: { sort: 'asc', nulls: 'first' } }],
    take: BATCH_SIZE - requested.length,
    select: { id: true, externalId: true },
  });

  return [...requested, ...fallback];
}

export async function syncNextFixtures(): Promise<void> {
  const teams = await pickBatch();
  if (teams.length === 0) return;
  console.log(`[next-fixtures-sync] ${teams.length} équipe(s) à (re)synchroniser`);

  for (const team of teams) {
    try {
      const response = await fetchV1<EventsDayResponse>('eventsnext.php', { id: team.externalId });
      const events = response.events ?? [];

      for (const event of events) {
        await upsertMatchFromScheduleEvent(event);
      }

      await prisma.team.update({
        where: { id: team.id },
        data: { nextFixturesSyncedAt: new Date(), nextFixturesRequestedAt: null },
      });
    } catch (err) {
      console.error(`[next-fixtures-sync] échec pour l'équipe ${team.externalId}:`, err);
    }
  }
}
