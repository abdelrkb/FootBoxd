import type {
  PublicUser,
  Match,
  Review,
  Comment,
  Notification,
  Profile,
  UserSummary,
  League,
  PopularReview,
  PopularMatch,
  ReviewWithMatch,
  ReviewDetail,
  MatchReviewFeed,
  MatchEvent,
  RatingDistribution,
  Team,
  Tag,
  TagSelection,
  WatchlistEntry,
  BlockStatus,
  CreateReportInput,
  Player,
  Standing,
  TeamOverview,
  TeamStats,
  UserSuggestion,
  UserWithRelation,
  FollowStatus,
} from '@football-app/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(res.status, message ?? `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- Auth ---
export const register = (email: string, password: string, displayName: string, username: string) =>
  apiFetch<PublicUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName, username }),
  });

export const login = (email: string, password: string) =>
  apiFetch<PublicUser>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const logout = () => apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST' });

export const getMe = () => apiFetch<PublicUser>('/auth/me');

export const googleLoginUrl = () => `${API_URL}/auth/google`;
export const appleLoginUrl = () => `${API_URL}/auth/apple`;

// --- Matches ---
export const getMatches = (date: string, leagueId?: string) =>
  apiFetch<Match[]>(`/matches?date=${date}${leagueId ? `&leagueId=${leagueId}` : ''}`);

export const getMatch = (id: string) => apiFetch<Match>(`/matches/${id}`);

export const getPopularMatches = () => apiFetch<PopularMatch[]>('/matches/popular');

export const getMatchEvents = (matchId: string) => apiFetch<MatchEvent[]>(`/matches/${matchId}/events`);

export const getRatingDistribution = (matchId: string) =>
  apiFetch<RatingDistribution>(`/matches/${matchId}/rating-distribution`);

// --- Reviews ---
export const getReviewsForMatch = (matchId: string) => apiFetch<Review[]>(`/reviews?matchId=${matchId}`);

export const getMatchReviewFeed = (matchId: string) =>
  apiFetch<MatchReviewFeed>(`/reviews/match-feed?matchId=${matchId}`);

export const getReview = (id: string) => apiFetch<ReviewDetail>(`/reviews/${id}`);

export const createReview = (
  matchId: string,
  rating: number,
  comment?: string,
  tags?: TagSelection[],
  quickRating?: boolean,
) => apiFetch<Review>('/reviews', { method: 'POST', body: JSON.stringify({ matchId, rating, comment, tags, quickRating }) });

export const deleteReview = (id: string) => apiFetch<void>(`/reviews/${id}`, { method: 'DELETE' });

export const updateReview = (
  id: string,
  data: { rating?: number; comment?: string; tags?: TagSelection[]; quickRating?: boolean },
) => apiFetch<Review>(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const likeReview = (id: string) => apiFetch<{ success: boolean }>(`/reviews/${id}/like`, { method: 'POST' });

export const unlikeReview = (id: string) => apiFetch<{ success: boolean }>(`/reviews/${id}/like`, { method: 'DELETE' });

export const getPopularReviews = () => apiFetch<PopularReview[]>('/reviews/popular');

export const getFollowingReviews = () => apiFetch<ReviewWithMatch[]>('/reviews/following');

// --- Tags ---
export const getTags = () => apiFetch<Tag[]>('/tags');

// --- Comments ---
export const getComments = (reviewId: string) => apiFetch<Comment[]>(`/reviews/${reviewId}/comments`);

export const createComment = (reviewId: string, content: string, parentId?: string) =>
  apiFetch<Comment>(`/reviews/${reviewId}/comments`, { method: 'POST', body: JSON.stringify({ content, parentId }) });

export const likeComment = (reviewId: string, commentId: string) =>
  apiFetch<{ success: boolean }>(`/reviews/${reviewId}/comments/${commentId}/like`, { method: 'POST' });

export const unlikeComment = (reviewId: string, commentId: string) =>
  apiFetch<{ success: boolean }>(`/reviews/${reviewId}/comments/${commentId}/like`, { method: 'DELETE' });

// --- Notifications ---
export const getNotifications = () => apiFetch<Notification[]>('/notifications');

export const markNotificationRead = (id: string) =>
  apiFetch<Notification>(`/notifications/${id}/read`, { method: 'PATCH' });

export const markAllNotificationsRead = () =>
  apiFetch<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });

// --- Users / Follows ---
export const getProfile = (userId: string) => apiFetch<Profile>(`/users/${userId}/profile`);

// Profil privé (issue #18) : `status` dit si le follow a été direct ou s'est transformé en
// demande en attente — voir follows.service.ts `follow`.
export const followUser = (userId: string) =>
  apiFetch<{ status: 'following' | 'requested' }>(`/users/${userId}/follow`, { method: 'POST' });

export const unfollowUser = (userId: string) =>
  apiFetch<{ success: boolean }>(`/users/${userId}/follow`, { method: 'DELETE' });

// Annotés de la relation avec le visiteur depuis l'issue #54 ; 403 si le profil est privé
// et non suivi.
export const getFollowers = (userId: string) => apiFetch<UserWithRelation[]>(`/users/${userId}/followers`);

export const getFollowing = (userId: string) => apiFetch<UserWithRelation[]>(`/users/${userId}/following`);

export const amIFollowing = (userId: string) => apiFetch<FollowStatus>(`/users/${userId}/am-i-following`);

export const acceptFollowRequest = (requesterId: string) =>
  apiFetch<{ success: boolean }>(`/users/${requesterId}/accept-follow-request`, { method: 'POST' });

export const rejectFollowRequest = (requesterId: string) =>
  apiFetch<{ success: boolean }>(`/users/${requesterId}/reject-follow-request`, { method: 'POST' });


export const setProfilePrivacy = (isPrivate: boolean) =>
  apiFetch<PublicUser>('/users/me/profile-privacy', { method: 'PATCH', body: JSON.stringify({ isPrivate }) });

export const setLocale = (locale: 'fr' | 'en') =>
  apiFetch<PublicUser>('/users/me/locale', { method: 'PATCH', body: JSON.stringify({ locale }) });

export const searchUsers = (query: string) =>
  apiFetch<UserSummary[]>(`/users/search?q=${encodeURIComponent(query)}`);

export const getFollowSuggestions = () => apiFetch<UserSuggestion[]>('/users/suggestions');

// --- Leagues / favoris ---
export const getAllLeagues = () => apiFetch<League[]>('/leagues');

export const getLeague = (id: string) => apiFetch<League>(`/leagues/${id}`);

export const searchLeagues = (query: string) =>
  apiFetch<League[]>(`/leagues/search?q=${encodeURIComponent(query)}`);

export const getFavoriteLeagues = (userId: string) => apiFetch<League[]>(`/users/${userId}/favorite-leagues`);

export const favoriteLeague = (leagueId: string) =>
  apiFetch<{ success: boolean }>(`/leagues/${leagueId}/favorite`, { method: 'POST' });

export const unfavoriteLeague = (leagueId: string) =>
  apiFetch<{ success: boolean }>(`/leagues/${leagueId}/favorite`, { method: 'DELETE' });

export const getTeamsForLeague = (leagueId: string) => apiFetch<Team[]>(`/leagues/${leagueId}/teams`);

// --- Club de cœur / préférences (onboarding, handoff design 2026-09-20) ---
export const setFavoriteTeam = (teamId: string | null) =>
  apiFetch<PublicUser>('/users/me/favorite-team', { method: 'PATCH', body: JSON.stringify({ teamId }) });

export const updatePreferences = (
  prefs: Partial<
    Pick<
      PublicUser,
      | 'notifyOnLike'
      | 'notifyOnComment'
      | 'notifyOnNewFollower'
      | 'notifyKickoffReminder'
      | 'notifyWatchlistKickoff'
      | 'hideScoresUntilClick'
    >
  >,
) => apiFetch<PublicUser>('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(prefs) });

export const completeOnboarding = () =>
  apiFetch<PublicUser>('/users/me/complete-onboarding', { method: 'POST' });

// --- Watchlist ---
export const getWatchlist = () => apiFetch<WatchlistEntry[]>('/watchlist');

export const getWatchlistIds = () => apiFetch<string[]>('/watchlist/ids');

export const getUserWatchlist = (userId: string) => apiFetch<WatchlistEntry[]>(`/users/${userId}/watchlist`);

export const addToWatchlist = (matchId: string) =>
  apiFetch<{ success: boolean }>(`/watchlist/${matchId}`, { method: 'POST' });

export const removeFromWatchlist = (matchId: string) =>
  apiFetch<{ success: boolean }>(`/watchlist/${matchId}`, { method: 'DELETE' });

export const setWatchlistVisibility = (isPublic: boolean) =>
  apiFetch<PublicUser>('/users/me/watchlist-visibility', { method: 'PATCH', body: JSON.stringify({ isPublic }) });

// --- Compte & sécurité (2026-10-02) ---

export const verifyEmail = (code: string) =>
  apiFetch<PublicUser>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ code }) });

export const resendVerificationCode = () =>
  apiFetch<{ success: boolean }>('/auth/resend-verification-code', { method: 'POST' });

export const forgotPassword = (email: string) =>
  apiFetch<{ success: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });

export const resetPassword = (email: string, code: string, newPassword: string) =>
  apiFetch<PublicUser>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) });

export const deleteAccount = (password?: string) =>
  apiFetch<{ success: boolean }>('/auth/me', { method: 'DELETE', body: JSON.stringify({ password }) });

export const updateProfile = (data: { displayName?: string; bio?: string }) =>
  apiFetch<PublicUser>('/users/me/profile', { method: 'PATCH', body: JSON.stringify(data) });

export const updateUsername = (username: string) =>
  apiFetch<PublicUser>('/users/me/username', { method: 'PATCH', body: JSON.stringify({ username }) });

// multipart/form-data : ne pas passer par apiFetch, qui force Content-Type: application/json
// (le navigateur doit fixer lui-même le boundary multipart).
export async function uploadAvatar(file: File): Promise<PublicUser> {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await fetch(`${API_URL}/users/me/avatar`, { method: 'POST', credentials: 'include', body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(res.status, message ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<PublicUser>;
}

export const removeAvatar = () => apiFetch<PublicUser>('/users/me/avatar', { method: 'DELETE' });

export const blockUser = (userId: string) => apiFetch<{ success: boolean }>(`/users/${userId}/block`, { method: 'POST' });

export const unblockUser = (userId: string) =>
  apiFetch<{ success: boolean }>(`/users/${userId}/block`, { method: 'DELETE' });

export const getBlockStatus = (userId: string) => apiFetch<BlockStatus>(`/users/${userId}/block-status`);

export const getBlockedAccounts = () => apiFetch<UserSummary[]>('/users/me/blocked-accounts');

export const createReport = (input: CreateReportInput) =>
  apiFetch<{ success: boolean }>('/reports', { method: 'POST', body: JSON.stringify(input) });

// --- Équipes (issue #7, 2026-10-20) ---

export const searchTeams = (query: string) => apiFetch<Team[]>(`/teams/search?q=${encodeURIComponent(query)}`);

// Matchs notés d'un utilisateur, paginés (issues #51 et #56).
export const getUserReviews = (
  userId: string,
  opts: { scope?: 'all' | 'season'; page?: number; pageSize?: number } = {},
) => {
  const params = new URLSearchParams();
  if (opts.scope) params.set('scope', opts.scope);
  if (opts.page !== undefined) params.set('page', String(opts.page));
  if (opts.pageSize !== undefined) params.set('pageSize', String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<{ items: ReviewWithMatch[]; total: number }>(`/users/${userId}/reviews${qs ? `?${qs}` : ''}`);
};

export const favoriteReview = (reviewId: string) =>
  apiFetch<{ success: boolean }>(`/reviews/${reviewId}/favorite`, { method: 'POST' });

export const unfavoriteReview = (reviewId: string) =>
  apiFetch<{ success: boolean }>(`/reviews/${reviewId}/favorite`, { method: 'DELETE' });

// Équipes suivies (issue #53), distinct du club de cœur unique de `setFavoriteTeam`.
export const getFavoriteTeams = (userId: string) => apiFetch<Team[]>(`/users/${userId}/favorite-teams`);

export const favoriteTeam = (teamId: string) =>
  apiFetch<{ success: boolean }>(`/teams/${teamId}/favorite`, { method: 'POST' });

export const unfavoriteTeam = (teamId: string) =>
  apiFetch<{ success: boolean }>(`/teams/${teamId}/favorite`, { method: 'DELETE' });

// Onglets de la page ligue (issue #58).
export const getLeagueStandings = (leagueId: string) => apiFetch<Standing[]>(`/leagues/${leagueId}/standings`);

export const getLeagueUpcomingMatches = (leagueId: string) =>
  apiFetch<Match[]>(`/leagues/${leagueId}/upcoming-matches`);

export const getTeamOverview = (teamId: string) => apiFetch<TeamOverview>(`/teams/${teamId}`);

export const getTeamStandings = (teamId: string) => apiFetch<Standing[]>(`/teams/${teamId}/standings`);

export const getTeamMatches = (teamId: string, scope: 'upcoming' | 'past') =>
  apiFetch<Match[]>(`/teams/${teamId}/matches?scope=${scope}`);

export const getTeamSquad = (teamId: string) => apiFetch<Player[]>(`/teams/${teamId}/squad`);

export const getTeamStats = (teamId: string) => apiFetch<TeamStats>(`/teams/${teamId}/stats`);
