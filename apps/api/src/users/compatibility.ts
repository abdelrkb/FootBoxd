import type { Prisma } from '@football-app/database';

// Calcul du "% de compatibilité" (issue #18), extrait ici parce qu'il sert à deux endroits
// depuis l'issue #55 : le détail pour un couple d'utilisateurs (users.service) et le calcul en
// lot pour les suggestions de l'accueil (follows.service).
//
// Chaque signal ne compte que s'il est réellement mesurable pour CE couple (ex: pas de pénalité
// si l'un des deux n'a pas de club favori) ; la moyenne ne porte que sur les signaux
// disponibles, pondérés également.

// Rewatch (issue #14) : plusieurs notes actives possibles pour le même match — on moyenne les
// notes d'un même utilisateur sur un même match avant de comparer.
export function averageRatingByMatch(reviews: { matchId: string; rating: Prisma.Decimal }[]) {
  const sums = new Map<string, { total: number; count: number }>();
  for (const r of reviews) {
    const entry = sums.get(r.matchId) ?? { total: 0, count: 0 };
    entry.total += Number(r.rating);
    entry.count += 1;
    sums.set(r.matchId, entry);
  }
  return new Map(Array.from(sums, ([matchId, { total, count }]) => [matchId, total / count]));
}

// Deux notes sont "d'accord" à un demi-point près.
export function ratingAgreement(viewerByMatch: Map<string, number>, otherByMatch: Map<string, number>) {
  const commonMatchIds = Array.from(viewerByMatch.keys()).filter((id) => otherByMatch.has(id));
  if (commonMatchIds.length === 0) return { score: null, commonMatches: 0 };
  const agreeing = commonMatchIds.filter((id) => Math.abs(viewerByMatch.get(id)! - otherByMatch.get(id)!) <= 0.5).length;
  return { score: (agreeing / commonMatchIds.length) * 100, commonMatches: commonMatchIds.length };
}

export function sameClubScore(viewerTeamId: string | null, otherTeamId: string | null) {
  if (!viewerTeamId || !otherTeamId) return null;
  return viewerTeamId === otherTeamId ? 100 : 0;
}

export function mutualFriendsScore(viewerFollowingCount: number, otherFollowingCount: number, mutualFriends: number) {
  if (viewerFollowingCount === 0 || otherFollowingCount === 0) return null;
  return (mutualFriends / Math.min(viewerFollowingCount, otherFollowingCount)) * 100;
}

export function compatibilityPercentage(scores: (number | null)[]) {
  const available = scores.filter((s): s is number => s !== null);
  if (available.length === 0) return null;
  return Math.round(available.reduce((a, b) => a + b, 0) / available.length);
}
