import { prisma } from '@football-app/database';
import { fetchV2 } from '../sportsdb/http.js';
import type { EventTimelineResponse } from '../sportsdb/types.js';
import type { MatchEventType } from '@football-app/database';

// Un match live reçoit de nouveaux événements au fil du match (buts, cartons) : on continue de
// re-fetcher la timeline complète tant qu'il est live, et jusqu'à 3h après la fin par sécurité
// (rattrapage si le dernier but est arrivé après notre dernier sync). L'upsert par externalId
// (idTimeline TheSportsDB, stable) rend ça idempotent — pas de doublon en re-fetchant les mêmes
// événements.
const EVENTS_WINDOW_AFTER_FINISH_MS = 3 * 60 * 60_000;

function mapEventType(raw: string): MatchEventType | null {
  const normalized = raw.toLowerCase();
  if (normalized === 'goal') return 'goal';
  if (normalized === 'card') return 'card';
  if (normalized === 'subst') return 'substitution';
  return null;
}

export async function syncMatchEvents(): Promise<void> {
  const finishedSince = new Date(Date.now() - EVENTS_WINDOW_AFTER_FINISH_MS);

  const candidates = await prisma.match.findMany({
    where: {
      OR: [{ status: 'live' }, { status: 'finished', updatedAt: { gte: finishedSince } }],
    },
    include: { homeTeam: true, awayTeam: true },
  });

  console.log(`[events-sync] ${candidates.length} match(s) à vérifier`);

  for (const match of candidates) {
    try {
      const response = await fetchV2<EventTimelineResponse>(`lookup/event_timeline/${match.externalId}`);
      const rows = response.lookup ?? [];
      if (rows.length === 0) continue;

      for (const row of rows) {
        const type = mapEventType(row.strTimeline);
        if (!type) {
          console.warn(
            `[events-sync] type d'événement inconnu "${row.strTimeline}" pour le match ${match.externalId} — ignoré`,
          );
          continue;
        }

        const teamId =
          row.idTeam === match.homeTeam.externalId
            ? match.homeTeam.id
            : row.idTeam === match.awayTeam.externalId
              ? match.awayTeam.id
              : null;
        if (!teamId) continue; // équipe qui ne correspond ni au domicile ni à l'extérieur, ne devrait pas arriver

        const data = {
          type,
          detail: row.strTimelineDetail,
          minute: Number.parseInt(row.intTime, 10) || 0,
          isHome: row.strHome === 'Yes',
          teamId,
          playerName: row.strPlayer,
          assistName: row.strAssist,
        };

        await prisma.matchEvent.upsert({
          where: { externalId: row.idTimeline },
          update: data,
          create: { ...data, externalId: row.idTimeline, matchId: match.id },
        });
      }
    } catch (err) {
      console.error(`[events-sync] échec pour le match ${match.externalId}:`, err);
    }
  }
}
