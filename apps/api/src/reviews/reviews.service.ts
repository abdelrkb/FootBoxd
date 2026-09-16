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
  user: { select: { id: true, displayName: true, avatarUrl: true } },
  _count: { select: { likes: true, comments: true } },
} as const;

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
}
