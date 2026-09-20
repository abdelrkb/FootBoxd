import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const matchInclude = {
  league: true,
  homeTeam: true,
  awayTeam: true,
} as const;

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  // Un jour donné du calendrier (section 7 : navigable jusqu'à +5 jours), groupé par ligue
  // côté client à partir de `league` inclus sur chaque match.
  findByDate(date: string, leagueId?: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    return this.prisma.client.match.findMany({
      where: {
        kickoffAt: { gte: dayStart, lte: dayEnd },
        ...(leagueId ? { leagueId } : {}),
      },
      include: matchInclude,
      orderBy: [{ league: { name: 'asc' } }, { kickoffAt: 'asc' }],
    });
  }

  async findById(id: string) {
    const match = await this.prisma.client.match.findUnique({
      where: { id },
      include: matchInclude,
    });
    if (!match) throw new NotFoundException('Match introuvable');
    return match;
  }

  // "Populaire" = le plus review sur une fenêtre de 48h (décision produit du 2026-09-17,
  // même fenêtre que les reviews populaires — voir reviews.service.ts).
  async findPopular(limit = 10) {
    const since = new Date(Date.now() - 48 * 60 * 60_000);
    const grouped = await this.prisma.client.review.groupBy({
      by: ['matchId'],
      where: { deletedAt: null, createdAt: { gte: since } },
      _count: { matchId: true },
      orderBy: { _count: { matchId: 'desc' } },
      take: limit,
    });
    if (grouped.length === 0) return [];

    const matches = await this.prisma.client.match.findMany({
      where: { id: { in: grouped.map((g) => g.matchId) } },
      include: matchInclude,
    });
    const rank = new Map(grouped.map((g, i) => [g.matchId, i]));
    return matches
      .map((match) => ({ ...match, reviewCount: grouped.find((g) => g.matchId === match.id)?._count.matchId ?? 0 }))
      .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }

  // "Faits de match" (handoff design du 2026-09-20) — alimenté par le worker via
  // event_timeline. Ordre chronologique (minute croissante), comme une timeline se lit.
  findEvents(matchId: string) {
    return this.prisma.client.matchEvent.findMany({
      where: { matchId },
      include: { team: true },
      orderBy: { minute: 'asc' },
    });
  }

  // Distribution des notes (handoff design du 2026-09-20) : histogramme 5→1. Les notes vont
  // par pas de 0.5 mais l'histogramme n'a que 5 barres — décision d'implémentation : chaque
  // barre regroupe deux valeurs (ex: la barre "4" compte les notes 3.5 ET 4), via Math.ceil.
  async findRatingDistribution(matchId: string) {
    const reviews = await this.prisma.client.review.findMany({
      where: { matchId, deletedAt: null },
      select: { rating: true },
    });
    const buckets = [1, 2, 3, 4, 5].map((star) => ({ star, count: 0 }));
    let sum = 0;
    for (const { rating } of reviews) {
      const value = Number(rating);
      sum += value;
      const bucketIndex = Math.min(5, Math.max(1, Math.ceil(value))) - 1;
      buckets[bucketIndex].count += 1;
    }
    return {
      average: reviews.length > 0 ? sum / reviews.length : 0,
      totalCount: reviews.length,
      buckets,
    };
  }
}
