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

  // Notification système (pas d'acteur humain) : rappel de coup d'envoi pour un match en
  // watchlist — voir apps/worker/src/sync/kickoff-reminders.ts. `actorId` = `recipientId` en
  // repli, le schéma n'ayant pas de colonne acteur nullable ; le front ignore l'acteur pour ce
  // type (voir LABELS dans apps/web/src/app/notifications/page.tsx) et affiche le match à la
  // place, résolu ci-dessous via `referenceId`.
  async createKickoffReminder(userId: string, matchId: string) {
    await this.prisma.client.notification.create({
      data: { recipientId: userId, actorId: userId, type: 'kickoff_reminder', referenceId: matchId },
    });
  }

  async findForUser(userId: string) {
    const notifications = await this.prisma.client.notification.findMany({
      where: { recipientId: userId },
      include: { actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Bouton "Suivre" en retour sur une notification de type follow (handoff design du
    // 2026-09-20) : indique si on suit déjà l'auteur de la notification.
    const followActorIds = notifications.filter((n) => n.type === 'follow').map((n) => n.actorId);
    const alreadyFollowing =
      followActorIds.length > 0
        ? await this.prisma.client.follow.findMany({
            where: { followerId: userId, followingId: { in: followActorIds } },
            select: { followingId: true },
          })
        : [];
    const followingSet = new Set(alreadyFollowing.map((f) => f.followingId));

    const kickoffMatchIds = notifications
      .filter((n) => n.type === 'kickoff_reminder' && n.referenceId)
      .map((n) => n.referenceId as string);
    const matches =
      kickoffMatchIds.length > 0
        ? await this.prisma.client.match.findMany({
            where: { id: { in: kickoffMatchIds } },
            include: { league: true, homeTeam: true, awayTeam: true },
          })
        : [];
    const matchById = new Map(matches.map((m) => [m.id, m]));

    return notifications.map((n) => ({
      ...n,
      isFollowingActor: n.type === 'follow' ? followingSet.has(n.actorId) : undefined,
      match: n.type === 'kickoff_reminder' && n.referenceId ? matchById.get(n.referenceId) : undefined,
    }));
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.client.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification introuvable');
    if (notification.recipientId !== userId) {
      throw new ForbiddenException("Cette notification n'appartient pas à cet utilisateur");
    }
    return this.prisma.client.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.client.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }
}
