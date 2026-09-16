// Types partagés web/mobile, alignés sur les réponses JSON réelles de l'API NestJS
// (vérifiées par appels curl le 2026-09-16) — pas une simple recopie des types Prisma :
// notamment `rating` est une string côté JSON (Decimal Prisma sérialisé), pas un number.

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'suspended'
  | 'abandoned';

export type NotificationType = 'comment' | 'like' | 'follow';

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface League {
  id: string;
  externalId: string;
  name: string;
  country: string | null;
  logoUrl: string | null;
  currentSeason: string | null;
}

export interface Team {
  id: string;
  externalId: string;
  name: string;
  logoUrl: string | null;
}

export interface Match {
  id: string;
  externalId: string;
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  kickoffAt: string;
  venue: string | null;
  season: string;
  lineups: unknown | null;
  highlightUrl: string | null;
  updatedAt: string;
  league: League;
  homeTeam: Team;
  awayTeam: Team;
}

export interface Review {
  id: string;
  userId: string;
  matchId: string;
  rating: string; // Decimal Prisma -> string en JSON, ex "4.5"
  comment: string | null;
  createdAt: string;
  deletedAt: string | null;
  user: UserSummary;
  _count: { likes: number; comments: number };
}

export interface ReviewWithMatch extends Review {
  match: Match;
}

export interface Comment {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: UserSummary;
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  type: NotificationType;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
  actor: UserSummary;
}

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  totalReviewsCount: number;
  reviewsThisSeasonCount: number;
  lastReviews: ReviewWithMatch[];
  followersCount: number;
  followingCount: number;
}
