// Champs vérifiés par appels réels le 2026-09-16 (voir architecture.md section 2).
// Tous les IDs/scores sont des strings côté API, jamais des nombres.

export interface SportsDbEvent {
  idEvent: string;
  idLeague: string;
  strLeague: string;
  strLeagueBadge: string | null;
  idHomeTeam: string;
  strHomeTeam: string;
  strHomeTeamBadge: string | null;
  idAwayTeam: string;
  strAwayTeam: string;
  strAwayTeamBadge: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string;
  strTimestamp: string; // UTC, confirmé — voir architecture.md section 8
  strVenue: string | null;
  // Observé null en réel (2026-09-16) sur des fixtures très en amont (ex: saison 2026-2027
  // pas encore confirmée) — pas toujours une string malgré la doc TheSportsDB.
  strSeason: string | null;
  strVideo: string | null; // lien highlight YouTube, déjà présent sur l'event (pas d'endpoint séparé)
}

export interface EventsDayResponse {
  events: SportsDbEvent[] | null;
}

// Payload plus léger que SportsDbEvent (pas de venue/season/video) — voir architecture.md section 2.
export interface SportsDbLiveScoreEvent {
  idEvent: string;
  idLeague: string;
  strLeague: string;
  idHomeTeam: string;
  strHomeTeam: string;
  strHomeTeamBadge: string | null;
  idAwayTeam: string;
  strAwayTeam: string;
  strAwayTeamBadge: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string;
  strProgress: string | null;
}

export interface LiveScoreResponse {
  livescore: SportsDbLiveScoreEvent[] | null;
}

export interface SportsDbLineupRow {
  idPlayer: string;
  strPlayer: string;
  strPosition: string | null;
  strPositionShort: string | null;
  strFormation: string | null;
  strHome: 'Yes' | 'No';
  strSubstitute: 'Yes' | 'No';
  intSquadNumber: string | null;
  idTeam: string;
  strTeam: string;
}

export interface EventLineupResponse {
  lookup: SportsDbLineupRow[] | null;
}
