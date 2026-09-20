import { prisma } from '@football-app/database';
import type { SportsDbEvent } from '../sportsdb/types.js';
import { mapApiStatus, TERMINAL_STATUSES } from './status-mapping.js';

function parseScore(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

// `strTimestamp` (UTC) manque parfois en réel sur des ligues mineures (ex. idEvent 2608123,
// FA Cup Oman, 2026-09-20 : strTimestamp null alors que dateEvent/strTime sont renseignés).
// Repli sur dateEvent+strTime en les traitant comme UTC, faute de mieux — même hypothèse que
// pour strTimestamp, pas de fuseau fourni par l'API sur ces fixtures.
function parseKickoff(event: SportsDbEvent): Date | null {
  if (event.strTimestamp) {
    const fromTimestamp = new Date(event.strTimestamp + 'Z');
    if (!Number.isNaN(fromTimestamp.getTime())) return fromTimestamp;
  }
  if (event.dateEvent && event.strTime) {
    const fromDateTime = new Date(`${event.dateEvent}T${event.strTime}Z`);
    if (!Number.isNaN(fromDateTime.getTime())) return fromDateTime;
  }
  return null;
}

async function upsertLeagueStub(event: SportsDbEvent) {
  // currentSeason mis à jour avec la valeur du dernier event VALIDE vu pour cette ligue (le
  // schedule-sync ne portant que sur les +5 prochains jours, c'est de facto la saison en cours
  // — voir architecture.md section 8). Bug corrigé le 2026-09-16 : un event sans saison encore
  // assignée (strSeason null, observé en réel sur des fixtures lointaines) ne doit JAMAIS
  // écraser une valeur déjà connue — sinon "dernier writer gagne" corrompt currentSeason à null
  // dès qu'un seul match de la ligue traité plus tard n'a pas encore de saison.
  return prisma.league.upsert({
    where: { externalId: event.idLeague },
    update: {
      name: event.strLeague,
      logoUrl: event.strLeagueBadge ?? undefined,
      ...(event.strSeason ? { currentSeason: event.strSeason } : {}),
    },
    create: {
      externalId: event.idLeague,
      name: event.strLeague,
      logoUrl: event.strLeagueBadge,
      currentSeason: event.strSeason,
    },
  });
}

async function upsertTeamStub(externalId: string, name: string, logoUrl: string | null) {
  return prisma.team.upsert({
    where: { externalId },
    update: { name, logoUrl: logoUrl ?? undefined },
    create: { externalId, name, logoUrl },
  });
}

// Upsert complet à partir d'un event `eventsday` (calendrier). Contient tous les champs
// (venue, season, video) contrairement au payload `livescore` plus léger — voir upsertLiveScore.
export async function upsertMatchFromScheduleEvent(event: SportsDbEvent): Promise<void> {
  const existing = await prisma.match.findUnique({ where: { externalId: event.idEvent } });
  if (existing && TERMINAL_STATUSES.includes(existing.status)) {
    // Terminé une fois pour toutes : on ne retouche plus jamais (section 2).
    return;
  }

  const status = mapApiStatus(event.strStatus, event.idEvent);
  if (!status) return;

  // `matches.season` est NOT NULL en base ; un event sans saison assignée (observé en réel sur
  // des fixtures lointaines) est ignoré ici et rattrapé à un cycle ultérieur, une fois l'API
  // à jour — même logique que pour un statut inconnu.
  if (!event.strSeason) {
    console.warn(`[upsert] saison absente pour le match ${event.idEvent} — ignoré pour l'instant`);
    return;
  }

  const kickoffAt = parseKickoff(event);
  if (!kickoffAt) {
    console.warn(`[upsert] date de coup d'envoi introuvable pour le match ${event.idEvent} — ignoré pour l'instant`);
    return;
  }

  const [league, homeTeam, awayTeam] = await Promise.all([
    upsertLeagueStub(event),
    upsertTeamStub(event.idHomeTeam, event.strHomeTeam, event.strHomeTeamBadge),
    upsertTeamStub(event.idAwayTeam, event.strAwayTeam, event.strAwayTeamBadge),
  ]);

  await prisma.match.upsert({
    where: { externalId: event.idEvent },
    update: {
      leagueId: league.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeScore: parseScore(event.intHomeScore),
      awayScore: parseScore(event.intAwayScore),
      status,
      kickoffAt,
      venue: event.strVenue,
      season: event.strSeason,
      highlightUrl: event.strVideo || null,
    },
    create: {
      externalId: event.idEvent,
      leagueId: league.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeScore: parseScore(event.intHomeScore),
      awayScore: parseScore(event.intAwayScore),
      status,
      kickoffAt,
      venue: event.strVenue,
      season: event.strSeason,
      highlightUrl: event.strVideo || null,
    },
  });
}
