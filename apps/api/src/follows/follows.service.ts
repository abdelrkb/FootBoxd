import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@football-app/database';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const PRISMA_UNIQUE_VIOLATION = 'P2002';
const userSummarySelect = { id: true, displayName: true, avatarUrl: true } as const;

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Follow public et instantané, pas de système de demande (section 6).
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Impossible de se suivre soi-même');
    }
    const target = await this.prisma.client.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    try {
      await this.prisma.client.follow.create({ data: { followerId, followingId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        return; // déjà suivi, idempotent
      }
      throw err;
    }
    await this.notificationsService.create(followingId, followerId, 'follow');
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.client.follow.deleteMany({ where: { followerId, followingId } });
  }

  findFollowers(userId: string) {
    return this.prisma.client.follow
      .findMany({ where: { followingId: userId }, include: { follower: { select: userSummarySelect } } })
      .then((rows) => rows.map((r) => r.follower));
  }

  findFollowing(userId: string) {
    return this.prisma.client.follow
      .findMany({ where: { followerId: userId }, include: { following: { select: userSummarySelect } } })
      .then((rows) => rows.map((r) => r.following));
  }

  countFollowers(userId: string) {
    return this.prisma.client.follow.count({ where: { followingId: userId } });
  }

  countFollowing(userId: string) {
    return this.prisma.client.follow.count({ where: { followerId: userId } });
  }
}
