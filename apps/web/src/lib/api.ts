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
  MatchEvent,
  RatingDistribution,
  Team,
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

export const getReview = (id: string) => apiFetch<Review>(`/reviews/${id}`);

export const createReview = (matchId: string, rating: number, comment?: string) =>
  apiFetch<Review>('/reviews', { method: 'POST', body: JSON.stringify({ matchId, rating, comment }) });

export const deleteReview = (id: string) => apiFetch<void>(`/reviews/${id}`, { method: 'DELETE' });

export const updateReview = (id: string, data: { rating?: number; comment?: string }) =>
  apiFetch<Review>(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const likeReview = (id: string) => apiFetch<{ success: boolean }>(`/reviews/${id}/like`, { method: 'POST' });

export const unlikeReview = (id: string) => apiFetch<{ success: boolean }>(`/reviews/${id}/like`, { method: 'DELETE' });

export const getPopularReviews = () => apiFetch<PopularReview[]>('/reviews/popular');

export const getFollowingReviews = () => apiFetch<ReviewWithMatch[]>('/reviews/following');

// --- Comments ---
export const getComments = (reviewId: string) => apiFetch<Comment[]>(`/reviews/${reviewId}/comments`);

export const createComment = (reviewId: string, content: string) =>
  apiFetch<Comment>(`/reviews/${reviewId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });

// --- Notifications ---
export const getNotifications = () => apiFetch<Notification[]>('/notifications');

export const markNotificationRead = (id: string) =>
  apiFetch<Notification>(`/notifications/${id}/read`, { method: 'PATCH' });

export const markAllNotificationsRead = () =>
  apiFetch<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });

// --- Users / Follows ---
export const getProfile = (userId: string) => apiFetch<Profile>(`/users/${userId}/profile`);

export const followUser = (userId: string) => apiFetch<{ success: boolean }>(`/users/${userId}/follow`, { method: 'POST' });

export const unfollowUser = (userId: string) =>
  apiFetch<{ success: boolean }>(`/users/${userId}/follow`, { method: 'DELETE' });

export const getFollowers = (userId: string) => apiFetch<UserSummary[]>(`/users/${userId}/followers`);

export const getFollowing = (userId: string) => apiFetch<UserSummary[]>(`/users/${userId}/following`);

export const amIFollowing = (userId: string) =>
  apiFetch<{ following: boolean }>(`/users/${userId}/am-i-following`).then((r) => r.following);

export const searchUsers = (query: string) =>
  apiFetch<UserSummary[]>(`/users/search?q=${encodeURIComponent(query)}`);

// --- Leagues / favoris ---
export const getAllLeagues = () => apiFetch<League[]>('/leagues');

export const getLeague = (id: string) => apiFetch<League>(`/leagues/${id}`);

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
      'notifyOnLike' | 'notifyOnComment' | 'notifyOnNewFollower' | 'notifyKickoffReminder' | 'hideScoresUntilClick'
    >
  >,
) => apiFetch<PublicUser>('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(prefs) });

export const completeOnboarding = () =>
  apiFetch<PublicUser>('/users/me/complete-onboarding', { method: 'POST' });
