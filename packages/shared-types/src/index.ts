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

export type NotificationType = 'comment' | 'like' | 'follow' | 'kickoff_reminder';

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // Club de cœur + réglages (handoff design du 2026-09-20).
  favoriteTeamId: string | null;
  notifyOnLike: boolean;
  notifyOnComment: boolean;
  notifyOnNewFollower: boolean;
  notifyKickoffReminder: boolean;
  notifyWatchlistKickoff: boolean;
  hideScoresUntilClick: boolean;
  hasCompletedOnboarding: boolean;
  isWatchlistPublic: boolean;
  // Compte & sécurité (2026-10-02).
  bio: string | null;
  emailVerifiedAt: string | null;
  usernameChangedAt: string | null;
}

export interface UserSummary {
  id: string;
  username: string;
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
  liveMinute: string | null;
  venue: string | null;
  season: string;
  lineups: unknown | null;
  highlightUrl: string | null;
  updatedAt: string;
  league: League;
  homeTeam: Team;
  awayTeam: Team;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  colorEnd: string | null;
}

// Ce que le front envoie pour poser un tag sur une review (log ou modification) : soit un tag
// existant (id, couleur/nom ignorés côté API), soit un nouveau tag (pas d'id, couleur choisie
// dans le color-picker — voir apps/api/src/reviews/dto/tag-input.dto.ts).
export interface TagSelection {
  id?: string;
  name: string;
  color?: string;
  colorEnd?: string | null;
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
  tags: Tag[];
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
  // Uniquement pour type "follow" (handoff design : bouton "Suivre" en retour).
  isFollowingActor?: boolean;
  // Uniquement pour type "kickoff_reminder" (pas d'acteur humain, voir notifications.service.ts).
  match?: Match;
}

export type MatchEventType = 'goal' | 'card' | 'substitution';

export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  detail: string | null;
  minute: number;
  isHome: boolean;
  teamId: string;
  playerName: string | null;
  assistName: string | null;
  team: Team;
}

export interface RatingDistribution {
  average: number;
  totalCount: number;
  buckets: { star: number; count: number }[];
}

export interface PopularReview extends ReviewWithMatch {
  popularityScore: number;
}

export interface PopularMatch extends Match {
  reviewCount: number;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  totalReviewsCount: number;
  reviewsThisSeasonCount: number;
  lastReviews: ReviewWithMatch[];
  favoriteMatches: ReviewWithMatch[];
  followersCount: number;
  followingCount: number;
  isWatchlistPublic: boolean;
}

export interface WatchlistEntry {
  userId: string;
  matchId: string;
  createdAt: string;
  reminderSentAt: string | null;
  match: Match;
}

// --- Compte & sécurité (2026-10-02) ---

export interface BlockStatus {
  blockedByOwner: boolean;
  viewerHasBlocked: boolean;
}

export type ReportTargetType = 'user' | 'review' | 'comment';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate_content' | 'fake_account' | 'other';

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}
