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

export type NotificationType =
  | 'comment'
  | 'like'
  | 'follow'
  | 'kickoff_reminder'
  | 'mention'
  | 'comment_reply'
  | 'comment_like'
  | 'follow_request'
  | 'follow_accepted';

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
  isPrivate: boolean;
  // i18n (issue #27) : null = pas de préférence explicite, la langue vient de la détection
  // automatique (cookie côté front).
  locale: string | null;
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

// Suggestions de personnes à suivre (issue #17) : `reason` dit pourquoi cette personne est
// suggérée (club favori commun, amis en commun, ou les deux), affiché tel quel côté front.
// Personne dans une liste d'abonnés/abonnements (issue #54), annotée de sa relation avec le
// visiteur pour l'afficher à côté du pseudo.
export interface UserWithRelation extends UserSummary {
  youFollow: boolean;
  followsYou: boolean;
  isSelf: boolean;
}

export interface UserSuggestion extends UserSummary {
  reason: 'same_club' | 'mutual_friends' | 'both';
  mutualFriends: number;
  // % de compatibilité (issue #55) : affiché ici plutôt que sur le profil. null quand aucun
  // signal n'est mesurable pour ce couple.
  compatibility: number | null;
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
  // Rewatch (issue #14, 2026-10-02) : 1 = premier visionnage de ce match par cet utilisateur,
  // 2+ = revisionnage (badge "Revu" côté front).
  watchNumber: number;
  // "Noter sans logger" (issue #15) : true si posée depuis une mini-card sans ouvrir la fiche.
  // Compte dans les stats/moyennes comme une review normale, exclue des flux de logs.
  quickRating: boolean;
  // "Matchs préférés" du profil (issue #51) : épinglé à la main par l'auteur. null = non épinglé.
  favoritedAt: string | null;
  user: UserSummary;
  _count: { likes: number; comments: number };
  tags: Tag[];
}

export interface ReviewWithMatch extends Review {
  match: Match;
}

// Réponse de GET /reviews/:id (page d'une review) : `likedByMe` vaut false pour un visiteur anonyme.
export interface ReviewDetail extends ReviewWithMatch {
  likedByMe: boolean;
}

export interface Comment {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  user: UserSummary;
  _count: { likes: number };
  // Un seul niveau de profondeur (issue #18) : les réponses d'un commentaire racine, à plat.
  // Absent sur une réponse elle-même (seuls les commentaires racines en ont).
  replies?: Comment[];
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
  // Club de cœur (unique) et autres équipes suivies, affichés sur le profil (issue #53).
  favoriteTeam: Team | null;
  favoriteTeams: Team[];
  followersCount: number;
  followingCount: number;
  isWatchlistPublic: boolean;
  isPrivate: boolean;
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

// Profil privé (issue #18) : `incomingRequest` = CET utilisateur (:id) a demandé à me suivre
// (affiché sur SON profil avec Accepter/Refuser, voir profile/[id]/page.tsx).
export interface FollowStatus {
  following: boolean;
  pendingRequest: boolean;
  incomingRequest: boolean;
}

// % de compatibilité (issue #18) : combine accord de notes sur les matchs vus en commun, club
// favori commun et amis en commun — `percentage` est null s'il n'y a litéralement aucun signal
// mesurable pour ce couple (aucun match commun, aucun club favori renseigné, aucun following).
export interface Compatibility {
  percentage: number | null;
  commonMatches: number;
  sameFavoriteTeam: boolean;
  mutualFriends: number;
}

export type ReportTargetType = 'user' | 'review' | 'comment';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate_content' | 'fake_account' | 'other';

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

// --- Page équipe (issue #7, 2026-10-20) ---

export interface Player {
  id: string;
  externalId: string;
  teamId: string;
  name: string;
  position: string | null;
  photoUrl: string | null;
  birthDate: string | null;
}

export interface Standing {
  id: string;
  leagueId: string;
  teamId: string;
  season: string;
  rank: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  description: string | null;
  team: { id: string; name: string; logoUrl: string | null };
}

export interface TeamOverview extends Team {
  primaryLeague: League | null;
  standing: Omit<Standing, 'team'> | null;
}

export interface TeamStats {
  averageRating: number | null;
  totalReviews: number;
  bestRatedMatch: { match: Match; averageRating: number } | null;
}
