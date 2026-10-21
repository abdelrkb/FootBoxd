import { prisma } from '@football-app/database';
import { fetchV1 } from '../sportsdb/http.js';
import type { StandingsResponse } from '../sportsdb/types.js';

// Page équipe (issue #7, 2026-10-20) : pas de sync périodique aveugle de toutes les ligues
// (décision produit) — on ne resynchronise le classement d'une ligue que si elle a un match en
// direct, ou un match qui vient de se terminer (fenêtre de rattrapage de 10 min, pour couvrir
// le délai entre deux ticks de ce loop). Garde le budget de 100 req/min pour les ligues
// réellement actives à cet instant, plutôt que ~350 appels par cycle pour rien.
const RECENTLY_FINISHED_WINDOW_MS = 10 * 60_000;

export async function syncStandings(): Promise<void> {
  const recentlyFinishedSince = new Date(Date.now() - RECENTLY_FINISHED_WINDOW_MS);

  const activeMatches = await prisma.match.findMany({
    where: {
      OR: [{ status: 'live' }, { status: 'finished', updatedAt: { gte: recentlyFinishedSince } }],
    },
    select: { league: { select: { id: true, externalId: true, currentSeason: true } } },
  });

  const leagues = new Map<string, { externalId: string; currentSeason: string }>();
  for (const { league } of activeMatches) {
    if (league.currentSeason) leagues.set(league.id, { externalId: league.externalId, currentSeason: league.currentSeason });
  }

  if (leagues.size === 0) return;
  console.log(`[standings-sync] ${leagues.size} ligue(s) à resynchroniser`);

  for (const [leagueId, { externalId, currentSeason }] of leagues) {
    try {
      const response = await fetchV1<StandingsResponse>('lookuptable.php', { l: externalId, s: currentSeason });
      const rows = response.table ?? [];
      if (rows.length === 0) continue;

      for (const row of rows) {
        const team = await prisma.team.findUnique({ where: { externalId: row.idTeam } });
        if (!team) {
          console.warn(`[standings-sync] équipe inconnue ${row.idTeam} (${row.strTeam}) — ignorée, rattrapée au prochain match sync`);
          continue;
        }

        const data = {
          rank: Number.parseInt(row.intRank, 10),
          played: Number.parseInt(row.intPlayed, 10),
          win: Number.parseInt(row.intWin, 10),
          draw: Number.parseInt(row.intDraw, 10),
          loss: Number.parseInt(row.intLoss, 10),
          goalsFor: Number.parseInt(row.intGoalsFor, 10),
          goalsAgainst: Number.parseInt(row.intGoalsAgainst, 10),
          goalDifference: Number.parseInt(row.intGoalDifference, 10),
          points: Number.parseInt(row.intPoints, 10),
          description: row.strDescription || null,
        };

        await prisma.standing.upsert({
          where: { leagueId_teamId_season: { leagueId, teamId: team.id, season: row.strSeason } },
          update: data,
          create: { ...data, leagueId, teamId: team.id, season: row.strSeason },
        });
      }
    } catch (err) {
      console.error(`[standings-sync] échec pour la ligue ${externalId}:`, err);
    }
  }
}
