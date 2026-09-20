import { prisma } from '@football-app/database';
import { fetchV2 } from '../sportsdb/http.js';
import type { LiveScoreResponse, SportsDbLiveScoreEvent } from '../sportsdb/types.js';
import { mapApiStatus, TERMINAL_STATUSES } from './status-mapping.js';
import { redis, LIVE_UPDATE_CHANNEL } from '../redis.js';

function parseScore(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

// Payload livescore plus léger que eventsday (pas de venue/season) : on ne met à jour que
// score+statut d'un match déjà connu, on ne le crée jamais ici (season est NOT NULL en base,
// on ne l'a pas dans ce payload). Un match live jamais vu par le schedule-sync sera repris
// au prochain cycle schedule-sync (10-15 min), au pire cas edge rare.
export async function syncLiveScores(): Promise<void> {
  let events: SportsDbLiveScoreEvent[];
  try {
    const response = await fetchV2<LiveScoreResponse>('livescore/soccer');
    events = response.livescore ?? [];
  } catch (err) {
    console.error('[live-sync] échec:', err);
    return;
  }

  console.log(`[live-sync] ${events.length} matchs en direct`);

  for (const event of events) {
    const existing = await prisma.match.findUnique({ where: { externalId: event.idEvent } });
    if (!existing) {
      console.warn(`[live-sync] match live inconnu en base, ignoré (rattrapé au prochain schedule-sync): ${event.idEvent}`);
      continue;
    }
    if (TERMINAL_STATUSES.includes(existing.status)) continue;

    const status = mapApiStatus(event.strStatus, event.idEvent);
    if (!status) continue;

    const updated = await prisma.match.update({
      where: { id: existing.id },
      data: {
        homeScore: parseScore(event.intHomeScore),
        awayScore: parseScore(event.intAwayScore),
        status,
        liveMinute: status === 'live' ? event.strProgress || null : null,
      },
    });

    await redis.publish(
      LIVE_UPDATE_CHANNEL,
      JSON.stringify({
        matchId: updated.id,
        homeScore: updated.homeScore,
        awayScore: updated.awayScore,
        status: updated.status,
        progress: event.strProgress,
      }),
    );
  }
}
