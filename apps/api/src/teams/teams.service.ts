import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@football-app/database';
import { PrismaService } from '../prisma/prisma.service.js';

const matchInclude = { league: true, homeTeam: true, awayTeam: true } as const;
const PRISMA_UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  search(query: string) {
    const q = query.trim();
    if (q.length < 2) return [];
    return this.prisma.client.team.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, logoUrl: true },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const team = await this.prisma.client.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Équipe introuvable');
    return team;
  }

  // "Sa ligue" (page équipe, issue #7, 2026-10-20) = la compétition où l'équipe a joué le plus
  // de matchs au total — pas de relation directe équipe/ligue en base (une équipe peut jouer
  // plusieurs compétitions : championnat + coupes européennes). Un championnat domestique a
  // largement plus de matchs qu'une phase de poules ou une coupe, ce qui le fait toujours
  // ressortir en premier sans avoir à maintenir une liste des noms de compétitions "coupe".
  private async findPrimaryLeagueId(teamId: string): Promise<string | null> {
    const grouped = await this.prisma.client.match.groupBy({
      by: ['leagueId'],
      where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
      _count: { leagueId: true },
      orderBy: { _count: { leagueId: 'desc' } },
      take: 1,
    });
    return grouped[0]?.leagueId ?? null;
  }

  async getOverview(teamId: string) {
    const team = await this.findById(teamId);

    // Signal non bloquant pour next-fixtures-sync.ts (worker) : cette équipe vient d'être
    // consultée, à prioriser au prochain tick plutôt que d'attendre son tour dans ~7000 équipes.
    // Pas d'appel TheSportsDB ici — règle d'or : seul le worker interroge l'API externe.
    this.prisma.client.team
      .update({ where: { id: teamId }, data: { nextFixturesRequestedAt: new Date() } })
      .catch(() => {});

    const primaryLeagueId = await this.findPrimaryLeagueId(teamId);

    let primaryLeague = null;
    let standing = null;
    if (primaryLeagueId) {
      primaryLeague = await this.prisma.client.league.findUnique({ where: { id: primaryLeagueId } });
      if (primaryLeague?.currentSeason) {
        standing = await this.prisma.client.standing.findUnique({
          where: { leagueId_teamId_season: { leagueId: primaryLeagueId, teamId, season: primaryLeague.currentSeason } },
        });
      }
    }

    return { ...team, primaryLeague, standing };
  }

  // Classement complet de la ligue (pas seulement la ligne de l'équipe) — "classement dans sa
  // ligue" sous-entend voir où elle se situe par rapport aux autres.
  async getStandingsTable(teamId: string) {
    const primaryLeagueId = await this.findPrimaryLeagueId(teamId);
    if (!primaryLeagueId) return [];
    const league = await this.prisma.client.league.findUnique({ where: { id: primaryLeagueId } });
    if (!league?.currentSeason) return [];

    return this.prisma.client.standing.findMany({
      where: { leagueId: primaryLeagueId, season: league.currentSeason },
      include: { team: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { rank: 'asc' },
    });
  }

  findMatches(teamId: string, scope: 'upcoming' | 'past') {
    if (scope === 'upcoming') {
      return this.prisma.client.match.findMany({
        where: {
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
          status: { in: ['scheduled', 'postponed', 'suspended'] },
        },
        include: matchInclude,
        orderBy: { kickoffAt: 'asc' },
      });
    }

    // "Matchs passés de la saison en cours, par compétition" (issue #7) : chaque match est
    // comparé à la saison en cours DE SA PROPRE ligue (match.league.currentSeason), pas à une
    // saison globale unique — un match de championnat et un match de coupe d'Europe ne sont pas
    // forcément exactement sur la même valeur de saison au même instant.
    return this.prisma.client.match
      .findMany({
        where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }], status: 'finished' },
        include: matchInclude,
        orderBy: { kickoffAt: 'desc' },
      })
      .then((matches) => matches.filter((m) => m.league.currentSeason !== null && m.season === m.league.currentSeason));
  }

  getSquad(teamId: string) {
    return this.prisma.client.player.findMany({ where: { teamId }, orderBy: { name: 'asc' } });
  }

  // "Note moyenne vue par la communauté" (toutes saisons) + "meilleur match de la saison"
  // (saison en cours uniquement) — calculés sur nos propres reviews, aucune donnée externe.
  async getStats(teamId: string) {
    const matches = await this.prisma.client.match.findMany({
      where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
      select: { id: true, season: true, league: { select: { currentSeason: true } } },
    });
    if (matches.length === 0) return { averageRating: null, totalReviews: 0, bestRatedMatch: null };

    const reviews = await this.prisma.client.review.findMany({
      where: { matchId: { in: matches.map((m) => m.id) }, deletedAt: null },
      select: { matchId: true, rating: true },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / totalReviews : null;

    const thisSeasonMatchIds = new Set(
      matches.filter((m) => m.league.currentSeason !== null && m.season === m.league.currentSeason).map((m) => m.id),
    );
    const ratingsByMatch = new Map<string, number[]>();
    for (const r of reviews) {
      if (!thisSeasonMatchIds.has(r.matchId)) continue;
      const list = ratingsByMatch.get(r.matchId) ?? [];
      list.push(Number(r.rating));
      ratingsByMatch.set(r.matchId, list);
    }

    let bestMatchId: string | null = null;
    let bestAverage = -1;
    for (const [matchId, ratings] of ratingsByMatch) {
      const avg = ratings.reduce((sum, v) => sum + v, 0) / ratings.length;
      if (avg > bestAverage) {
        bestAverage = avg;
        bestMatchId = matchId;
      }
    }

    const bestRatedMatch = bestMatchId
      ? {
          match: await this.prisma.client.match.findUnique({ where: { id: bestMatchId }, include: matchInclude }),
          averageRating: bestAverage,
        }
      : null;

    return { averageRating, totalReviews, bestRatedMatch };
  }

  // Équipes suivies (issue #53) — distinct du club de cœur (User.favoriteTeamId), qui reste
  // unique. Même pattern idempotent que les ligues favorites (LeaguesService.addFavorite).
  findFavoritesForUser(userId: string) {
    return this.prisma.client.favoriteTeam
      .findMany({ where: { userId }, include: { team: true }, orderBy: { createdAt: 'asc' } })
      .then((rows) => rows.map((r) => r.team));
  }

  async addFavorite(userId: string, teamId: string) {
    await this.findById(teamId);
    try {
      await this.prisma.client.favoriteTeam.create({ data: { userId, teamId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        return; // déjà suivie, idempotent
      }
      throw err;
    }
  }

  async removeFavorite(userId: string, teamId: string) {
    await this.prisma.client.favoriteTeam.deleteMany({ where: { userId, teamId } });
  }
}
