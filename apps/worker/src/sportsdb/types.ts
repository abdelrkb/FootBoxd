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
  // UTC, confirmé — voir architecture.md section 8. Observé `null` en réel (2026-09-20, ex.
  // idEvent 2608123, ligue mineure) malgré le typage optimiste de la doc — dateEvent/strTime
  // servent de repli (voir parseKickoff dans upsert.ts).
  strTimestamp: string | null;
  dateEvent: string | null;
  strTime: string | null;
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

// Vérifié réel le 2026-09-20 sur GET /v2/json/lookup/event_timeline/{idEvent} : types observés
// "Goal", "Card", "subst" (les valeurs exactes de strTimeline, sensibles à la casse telles que
// renvoyées par l'API — pas normalisées ici, c'est le rôle du worker de les mapper).
export interface SportsDbTimelineRow {
  idTimeline: string;
  idEvent: string;
  strTimeline: string; // "Goal" | "Card" | "subst" observés
  strTimelineDetail: string | null; // "Normal Goal", "Yellow Card", ... — valeur libre
  strHome: 'Yes' | 'No';
  idPlayer: string | null;
  strPlayer: string | null;
  idAssist: string | null;
  strAssist: string | null;
  intTime: string;
  idTeam: string;
  strTeam: string;
}

export interface EventTimelineResponse {
  lookup: SportsDbTimelineRow[] | null;
}
