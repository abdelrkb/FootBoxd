import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { BlocksService } from '../blocks/blocks.service.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
    private readonly notificationsService: NotificationsService,
    private readonly blocksService: BlocksService,
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
    if (await this.blocksService.isEitherBlocked(userId, review.user.id)) {
      throw new ForbiddenException('Action impossible');
    }
    const comment = await this.prisma.client.comment.create({
      data: { reviewId, userId, content },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    await this.notificationsService.create(review.user.id, userId, 'comment', reviewId);
    return comment;
  }
}
