import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@football-app/database';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { BlocksService } from '../blocks/blocks.service.js';
import {
  averageRatingByMatch,
  compatibilityPercentage,
  mutualFriendsScore,
  ratingAgreement,
  sameClubScore,
} from '../users/compatibility.js';

const PRISMA_UNIQUE_VIOLATION = 'P2002';
const userSummarySelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly blocksService: BlocksService,
  ) {}

  // Follow public et instantané pour un profil public (section 6). Profil privé (issue #18,
  // 2026-10-22) : crée une FollowRequest à accepter/refuser au lieu d'un Follow direct — voir
  // acceptFollowRequest/rejectFollowRequest ci-dessous. Retourne le statut résultant pour que
  // le front sache afficher "Suivi(e)" ou "Demande envoyée".
  async follow(followerId: string, followingId: string): Promise<{ status: 'following' | 'requested' }> {
    if (followerId === followingId) {
      throw new BadRequestException('Impossible de se suivre soi-même');
    }
    const target = await this.prisma.client.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');
    if (await this.blocksService.isEitherBlocked(followerId, followingId)) {
      throw new ForbiddenException('Impossible de suivre cet utilisateur');
    }

    if (target.isPrivate) {
      try {
        await this.prisma.client.followRequest.create({ data: { requesterId: followerId, targetId: followingId } });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
          return { status: 'requested' }; // déjà demandé, idempotent
        }
        throw err;
      }
      await this.notificationsService.create(followingId, followerId, 'follow_request');
      return { status: 'requested' };
    }

    try {
      await this.prisma.client.follow.create({ data: { followerId, followingId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        return { status: 'following' }; // déjà suivi, idempotent
      }
      throw err;
    }
    await this.notificationsService.create(followingId, followerId, 'follow');
    return { status: 'following' };
  }

  // Annule aussi une demande en attente (même bouton côté front pour "se désabonner" et
  // "annuler ma demande" — le visiteur n'a qu'une seule action à faire dans les deux cas).
  async unfollow(followerId: string, followingId: string) {
    await Promise.all([
      this.prisma.client.follow.deleteMany({ where: { followerId, followingId } }),
      this.prisma.client.followRequest.deleteMany({ where: { requesterId: followerId, targetId: followingId } }),
    ]);
  }

  // "Version minimale : juste une notification" (issue #18) — pas de liste dédiée, l'owner
  // accepte/refuse directement depuis le ··· sur la notification follow_request ou le profil
  // du demandeur (voir notifications/page.tsx et profile/[id]/page.tsx).
  async acceptFollowRequest(targetId: string, requesterId: string) {
    const request = await this.prisma.client.followRequest.findUnique({
      where: { requesterId_targetId: { requesterId, targetId } },
    });
    if (!request) throw new NotFoundException('Demande introuvable');

    await this.prisma.client.$transaction([
      this.prisma.client.followRequest.delete({ where: { requesterId_targetId: { requesterId, targetId } } }),
      this.prisma.client.follow.create({ data: { followerId: requesterId, followingId: targetId } }),
    ]);
    await this.notificationsService.create(requesterId, targetId, 'follow_accepted');
  }

  // Refus silencieux (pas de notification) — convention courante, éviter l'embarras d'un refus
  // explicite notifié.
  async rejectFollowRequest(targetId: string, requesterId: string) {
    await this.prisma.client.followRequest.deleteMany({ where: { requesterId, targetId } });
  }

  async hasPendingRequest(requesterId: string, targetId: string): Promise<boolean> {
    const request = await this.prisma.client.followRequest.findUnique({
      where: { requesterId_targetId: { requesterId, targetId } },
    });
    return request !== null;
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

  // Listes d'abonnés/abonnements (issue #54) : on annote chaque personne de la relation avec le
  // VISITEUR (le suit-il ? est-il suivi par elle ?), pour l'afficher à côté du pseudo. Deux
  // requêtes quelle que soit la taille de la liste.
  async withViewerRelation(viewerId: string | null, users: { id: string }[]) {
    if (!viewerId || users.length === 0) {
      return users.map((u) => ({ ...u, youFollow: false, followsYou: false, isSelf: false }));
    }
    const ids = users.map((u) => u.id);
    const [followedByViewer, followingViewer] = await Promise.all([
      this.prisma.client.follow.findMany({
        where: { followerId: viewerId, followingId: { in: ids } },
        select: { followingId: true },
      }),
      this.prisma.client.follow.findMany({
        where: { followerId: { in: ids }, followingId: viewerId },
        select: { followerId: true },
      }),
    ]);
    const youFollow = new Set(followedByViewer.map((f) => f.followingId));
    const followsYou = new Set(followingViewer.map((f) => f.followerId));
    return users.map((u) => ({
      ...u,
      youFollow: youFollow.has(u.id),
      followsYou: followsYou.has(u.id),
      isSelf: u.id === viewerId,
    }));
  }

  countFollowers(userId: string) {
    return this.prisma.client.follow.count({ where: { followingId: userId } });
  }

  countFollowing(userId: string) {
    return this.prisma.client.follow.count({ where: { followerId: userId } });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const link = await this.prisma.client.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return link !== null;
  }

  // "Suggestions de personnes à suivre" (issue #17) : deux sources combinées — supporters du
  // même club favori, et "amis de tes amis" (personnes suivies par des gens que tu suis, triées
  // par nombre de contacts en commun qui les suivent). Exclut soi-même, les gens déjà suivis, et
  // tout utilisateur bloqué dans un sens ou l'autre (même règle que follow()/isEitherBlocked).
  async getSuggestions(userId: string, limit = 10) {
    const [me, followingRows, blockedRows, blockedByRows] = await Promise.all([
      this.prisma.client.user.findUnique({ where: { id: userId }, select: { favoriteTeamId: true } }),
      this.prisma.client.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      this.prisma.client.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
      this.prisma.client.block.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
    ]);

    const followingIds = followingRows.map((f) => f.followingId);
    const excludeIds = [
      userId,
      ...followingIds,
      ...blockedRows.map((b) => b.blockedId),
      ...blockedByRows.map((b) => b.blockerId),
    ];

    const [sameClubUsers, friendsOfFriendsRows] = await Promise.all([
      me?.favoriteTeamId
        ? this.prisma.client.user.findMany({
            where: { favoriteTeamId: me.favoriteTeamId, deletedAt: null, id: { notIn: excludeIds } },
            select: userSummarySelect,
            take: limit * 2,
          })
        : Promise.resolve([]),
      followingIds.length
        ? this.prisma.client.follow.findMany({
            where: { followerId: { in: followingIds }, followingId: { notIn: excludeIds } },
            select: { followingId: true },
          })
        : Promise.resolve([]),
    ]);

    const mutualCount = new Map<string, number>();
    for (const row of friendsOfFriendsRows) {
      mutualCount.set(row.followingId, (mutualCount.get(row.followingId) ?? 0) + 1);
    }
    const friendsOfFriendsIds = Array.from(mutualCount.keys()).sort(
      (a, b) => (mutualCount.get(b) ?? 0) - (mutualCount.get(a) ?? 0),
    );
    const friendsOfFriendsUsers = friendsOfFriendsIds.length
      ? await this.prisma.client.user.findMany({
          where: { id: { in: friendsOfFriendsIds.slice(0, limit * 2) }, deletedAt: null },
          select: userSummarySelect,
        })
      : [];

    type Reason = 'same_club' | 'mutual_friends' | 'both';
    const combined = new Map<string, { user: (typeof sameClubUsers)[number]; reason: Reason; mutualFriends: number }>();
    for (const user of sameClubUsers) {
      combined.set(user.id, { user, reason: 'same_club', mutualFriends: 0 });
    }
    // Préserve l'ordre par nombre de contacts communs décroissant (friendsOfFriendsIds déjà trié).
    for (const id of friendsOfFriendsIds) {
      const user = friendsOfFriendsUsers.find((u) => u.id === id);
      if (!user) continue;
      const existing = combined.get(id);
      const mutualFriends = mutualCount.get(id) ?? 0;
      if (existing) existing.reason = 'both';
      else combined.set(id, { user, reason: 'mutual_friends', mutualFriends });
    }

    const ranked = Array.from(combined.values())
      .sort((a, b) => {
        if (a.reason === 'both' && b.reason !== 'both') return -1;
        if (b.reason === 'both' && a.reason !== 'both') return 1;
        return b.mutualFriends - a.mutualFriends;
      })
      .slice(0, limit);

    const compatibilityByUser = await this.compatibilityFor(
      userId,
      me?.favoriteTeamId ?? null,
      followingIds,
      ranked.map((r) => r.user.id),
    );

    return ranked.map(({ user, reason, mutualFriends }) => ({
      ...user,
      reason,
      mutualFriends,
      compatibility: compatibilityByUser.get(user.id) ?? null,
    }));
  }

  // % de compatibilité des suggestions (issue #55) : affiché sur l'accueil à côté de la raison
  // de la suggestion. Calculé en lot — un appel par utilisateur suggéré ferait 6 requêtes
  // chacun, ici c'est 4 requêtes quel que soit le nombre de suggestions.
  private async compatibilityFor(
    viewerId: string,
    viewerTeamId: string | null,
    viewerFollowingIds: string[],
    otherIds: string[],
  ) {
    const result = new Map<string, number | null>();
    if (otherIds.length === 0) return result;

    const [viewerReviews, otherReviews, others, otherFollowCounts, sharedFollowRows] = await Promise.all([
      this.prisma.client.review.findMany({
        where: { userId: viewerId, deletedAt: null },
        select: { matchId: true, rating: true },
      }),
      this.prisma.client.review.findMany({
        where: { userId: { in: otherIds }, deletedAt: null },
        select: { userId: true, matchId: true, rating: true },
      }),
      this.prisma.client.user.findMany({
        where: { id: { in: otherIds } },
        select: { id: true, favoriteTeamId: true },
      }),
      this.prisma.client.follow.groupBy({
        by: ['followerId'],
        where: { followerId: { in: otherIds } },
        _count: { followingId: true },
      }),
      viewerFollowingIds.length
        ? this.prisma.client.follow.findMany({
            where: { followerId: { in: otherIds }, followingId: { in: viewerFollowingIds } },
            select: { followerId: true },
          })
        : Promise.resolve([]),
    ]);

    const viewerByMatch = averageRatingByMatch(viewerReviews);
    const reviewsByUser = new Map<string, { matchId: string; rating: Prisma.Decimal }[]>();
    for (const r of otherReviews) {
      const list = reviewsByUser.get(r.userId) ?? [];
      list.push({ matchId: r.matchId, rating: r.rating });
      reviewsByUser.set(r.userId, list);
    }
    const followCountByUser = new Map(otherFollowCounts.map((row) => [row.followerId, row._count.followingId]));
    const sharedFollowsByUser = new Map<string, number>();
    for (const row of sharedFollowRows) {
      sharedFollowsByUser.set(row.followerId, (sharedFollowsByUser.get(row.followerId) ?? 0) + 1);
    }

    for (const other of others) {
      const agreement = ratingAgreement(viewerByMatch, averageRatingByMatch(reviewsByUser.get(other.id) ?? []));
      result.set(
        other.id,
        compatibilityPercentage([
          agreement.score,
          sameClubScore(viewerTeamId, other.favoriteTeamId),
          mutualFriendsScore(
            viewerFollowingIds.length,
            followCountByUser.get(other.id) ?? 0,
            sharedFollowsByUser.get(other.id) ?? 0,
          ),
        ]),
      );
    }
    return result;
  }
}
