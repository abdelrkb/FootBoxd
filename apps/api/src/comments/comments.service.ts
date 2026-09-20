import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findForReview(reviewId: string) {
    return this.prisma.client.comment.findMany({
      where: { reviewId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(reviewId: string, userId: string, content: string) {
    const review = await this.reviewsService.findActiveById(reviewId);
    const comment = await this.prisma.client.comment.create({
      data: { reviewId, userId, content },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    await this.notificationsService.create(review.user.id, userId, 'comment', reviewId);
    return comment;
  }
}
