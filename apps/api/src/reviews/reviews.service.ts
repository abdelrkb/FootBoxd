import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@football-app/database';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

function assertValidRating(rating: number) {
  const isInRange = rating >= 0.5 && rating <= 5;
  const isHalfStep = Math.round(rating * 10) % 5 === 0;
  if (!isInRange || !isHalfStep) {
    throw new BadRequestException('La note doit être comprise entre 0.5 et 5, par pas de 0.5');
  }
}

const reviewInclude = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  _count: { select: { likes: true, comments: true } },
} as const;

const reviewWithMatchInclude = {
  ...reviewInclude,
  match: { include: { league: true, homeTeam: true, awayTeam: true } },
} as const;

// "Populaire" = calculé sur une fenêtre glissante de 48h (décision produit du 2026-09-17) —
// reste pertinent avec l'actualité plutôt qu'un classement absolu figé dans le temps.
const POPULARITY_WINDOW_MS = 48 * 60 * 60_000;

function popularityScore(counts: { likes: number; comments: number }): number {
  // likes + commentaires × 2 (décision produit du 2026-09-17 : valorise l'engagement/discussion
  // davantage qu'un like passif).
  return counts.likes + counts.comments * 2;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    assertValidRating(dto.rating);

    const match = await this.prisma.client.match.findUnique({ where: { id: dto.matchId } });
    if (!match) throw new NotFoundException('Match introuvable');

    try {
      return await this.prisma.client.review.create({
        data: { userId, matchId: dto.matchId, rating: dto.rating, comment: dto.comment },
        include: reviewInclude,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        throw new ConflictException('Vous avez déjà noté ce match');
      }
      throw err;
    }
  }

  findForMatch(matchId: string) {
    return this.prisma.client.review.findMany({
      where: { matchId, deletedAt: null },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveById(id: string) {
    const review = await this.prisma.client.review.findUnique({ where: { id }, include: reviewInclude });
    if (!review || review.deletedAt) throw new NotFoundException('Review introuvable');
    return review;
  }

  async softDelete(id: string, userId: string) {
    const review = await this.prisma.client.review.findUnique({ where: { id } });
    if (!review || review.deletedAt) throw new NotFoundException('Review introuvable');
    if (review.userId !== userId) throw new ForbiddenException("Cette review n'est pas la vôtre");

    await this.prisma.client.review.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // "Modifier ma note" (handoff design du 2026-09-20, menu ··· sur sa propre review).
  async update(id: string, userId: string, data: { rating?: number; comment?: string }) {
    const review = await this.prisma.client.review.findUnique({ where: { id } });
    if (!review || review.deletedAt) throw new NotFoundException('Review introuvable');
    if (review.userId !== userId) throw new ForbiddenException("Cette review n'est pas la vôtre");
    if (data.rating !== undefined) assertValidRating(data.rating);

    return this.prisma.client.review.update({
      where: { id },
      data: { rating: data.rating, comment: data.comment },
      include: reviewInclude,
    });
  }

  async like(reviewId: string, userId: string) {
    const review = await this.findActiveById(reviewId);
    try {
      await this.prisma.client.reviewLike.create({ data: { reviewId, userId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        return; // déjà liké, idempotent
      }
      throw err;
    }
    await this.notificationsService.create(review.user.id, userId, 'like', reviewId);
  }

  async unlike(reviewId: string, userId: string) {
    await this.prisma.client.reviewLike.deleteMany({ where: { reviewId, userId } });
  }

  async findPopular(limit = 10) {
    const since = new Date(Date.now() - POPULARITY_WINDOW_MS);
    const candidates = await this.prisma.client.review.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      include: reviewWithMatchInclude,
    });
    return candidates
      .map((review) => ({ ...review, popularityScore: popularityScore(review._count) }))
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  }

  // "Mes amis" = les utilisateurs que je suis (section 6 : follows). Pas de fenêtre temporelle
  // ici, juste les N plus récentes (contrairement à "populaire" qui est borné à 48h).
  findFromFollowing(userId: string, limit = 10) {
    return this.prisma.client.review.findMany({
      where: {
        deletedAt: null,
        user: { followers: { some: { followerId: userId } } },
      },
      include: reviewWithMatchInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
