import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationType } from '@football-app/database';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Pas de notification quand on agit sur son propre contenu (like/comment sur sa propre
  // review, ou... un follow sur soi-même est de toute façon impossible via l'API).
  async create(recipientId: string, actorId: string, type: NotificationType, referenceId?: string) {
    if (recipientId === actorId) return;
    await this.prisma.client.notification.create({
      data: { recipientId, actorId, type, referenceId },
    });
  }

  findForUser(userId: string) {
    return this.prisma.client.notification.findMany({
      where: { recipientId: userId },
      include: { actor: { select: { id: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.client.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification introuvable');
    if (notification.recipientId !== userId) {
      throw new ForbiddenException("Cette notification n'appartient pas à cet utilisateur");
    }
    return this.prisma.client.notification.update({ where: { id }, data: { isRead: true } });
  }
}
