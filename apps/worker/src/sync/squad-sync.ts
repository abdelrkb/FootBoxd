import { prisma } from '@football-app/database';
import { fetchV2 } from '../sportsdb/http.js';
import type { SquadResponse } from '../sportsdb/types.js';

// Page équipe (issue #7, 2026-10-20) : des milliers d'équipes existent en base (une par équipe
// jamais vue dans un match), la plupart jamais consultées — pas de sync aveugle de toutes. Par
// petit lot à chaque tick, équipes jamais synchronisées d'abord (squadSyncedAt null), puis les
// plus anciennes — couvre tout le monde avec le temps sans jamais dépasser le budget API.
const BATCH_SIZE = 5;
const STALE_AFTER_MS = 7 * 24 * 60 * 60_000;

function parseBirthDate(raw: string | null): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function syncSquads(): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);

  const teams = await prisma.team.findMany({
    where: { OR: [{ squadSyncedAt: null }, { squadSyncedAt: { lt: staleBefore } }] },
    orderBy: [{ squadSyncedAt: { sort: 'asc', nulls: 'first' } }],
    take: BATCH_SIZE,
  });

  if (teams.length === 0) return;
  console.log(`[squad-sync] ${teams.length} équipe(s) à (re)synchroniser`);

  for (const team of teams) {
    try {
      const response = await fetchV2<SquadResponse>(`list/players/${team.externalId}`);
      const players = response.list ?? [];

      // Effectif jamais référencé ailleurs (pas de FK entrante) : remplacement complet plus
      // simple et plus sûr qu'un diff ligne à ligne (transferts sortants supprimés d'office).
      await prisma.$transaction([
        prisma.player.deleteMany({ where: { teamId: team.id } }),
        prisma.player.createMany({
          data: players.map((p) => ({
            externalId: p.idPlayer,
            teamId: team.id,
            name: p.strPlayer,
            position: p.strPosition,
            photoUrl: p.strThumb,
            birthDate: parseBirthDate(p.dateBorn),
          })),
        }),
        prisma.team.update({ where: { id: team.id }, data: { squadSyncedAt: new Date() } }),
      ]);
    } catch (err) {
      console.error(`[squad-sync] échec pour l'équipe ${team.externalId}:`, err);
    }
  }
}
