import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@football-app/database';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { BlocksService } from '../blocks/blocks.service.js';
import type { NotificationType } from '@football-app/database';

const PRISMA_UNIQUE_VIOLATION = 'P2002';
const userSelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

// Même charset que update-username.dto.ts (usernames toujours stockés en minuscule).
const MENTION_PATTERN = /@([a-z0-9_]{3,20})/gi;

// Priorité quand plusieurs raisons de notifier la même personne se chevauchent sur UN même
// commentaire (ex: je réponds à l'auteur de la review en le mentionnant aussi) — une seule
// notification par destinataire et par action, la plus spécifique gagne (issue #18, 2026-10-22).
const NOTIFICATION_PRIORITY: NotificationType[] = ['comment_reply', 'comment', 'mention'];

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
    private readonly notificationsService: NotificationsService,
    private readonly blocksService: BlocksService,
  ) {}

  // Un seul niveau de profondeur (issue #18) : les réponses d'une réponse sont visibles à plat
  // sous le commentaire racine plutôt qu'imbriquées à l'infini — le front affiche `replies`
  // directement sous chaque commentaire racine.
  async findForReview(reviewId: string) {
    const comments = await this.prisma.client.comment.findMany({
      where: { reviewId },
      include: { user: { select: userSelect }, _count: { select: { likes: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const roots = comments.filter((c) => c.parentId === null);
    const repliesByParent = new Map<string, typeof comments>();
    for (const c of comments) {
      if (c.parentId === null) continue;
      const list = repliesByParent.get(c.parentId) ?? [];
      list.push(c);
      repliesByParent.set(c.parentId, list);
    }

    return roots.map((root) => ({ ...root, replies: repliesByParent.get(root.id) ?? [] }));
  }

  private async resolveMentions(content: string, excludeIds: Set<string>) {
    const usernames = new Set(
      Array.from(content.matchAll(MENTION_PATTERN)).map((m) => m[1].toLowerCase()),
    );
    if (usernames.size === 0) return [];
    const users = await this.prisma.client.user.findMany({
      where: { username: { in: Array.from(usernames) }, deletedAt: null },
      select: { id: true },
    });
    return users.map((u) => u.id).filter((id) => !excludeIds.has(id));
  }

  async create(reviewId: string, userId: string, content: string, parentId?: string) {
    const review = await this.reviewsService.findActiveById(reviewId);
    if (await this.blocksService.isEitherBlocked(userId, review.user.id)) {
      throw new ForbiddenException('Action impossible');
    }

    let resolvedParentId: string | null = null;
    let parentAuthorId: string | null = null;
    if (parentId) {
      const parent = await this.prisma.client.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.reviewId !== reviewId) throw new NotFoundException('Commentaire introuvable');
      // Flatten : une réponse à une réponse se rattache au commentaire RACINE (1 seul niveau).
      resolvedParentId = parent.parentId ?? parent.id;
      const rootAuthor = parent.parentId
        ? (await this.prisma.client.comment.findUnique({ where: { id: parent.parentId } }))?.userId ?? null
        : parent.userId;
      parentAuthorId = rootAuthor;
      if (await this.blocksService.isEitherBlocked(userId, parent.userId)) {
        throw new ForbiddenException('Action impossible');
      }
    }

    const comment = await this.prisma.client.comment.create({
      data: { reviewId, userId, content, parentId: resolvedParentId },
      include: { user: { select: userSelect } },
    });

    // Une seule notification par destinataire (voir NOTIFICATION_PRIORITY) : on calcule toutes
    // les raisons possibles puis on ne garde que la plus spécifique pour chaque personne.
    const candidates = new Map<string, NotificationType[]>();
    const addCandidate = (recipientId: string, type: NotificationType) => {
      if (recipientId === userId) return; // jamais se notifier soi-même
      const existing = candidates.get(recipientId) ?? [];
      existing.push(type);
      candidates.set(recipientId, existing);
    };

    addCandidate(review.user.id, 'comment');
    if (parentAuthorId) addCandidate(parentAuthorId, 'comment_reply');

    // Une mention qui tombe sur l'auteur de la review ou du commentaire parent ne crée pas de
    // notification séparée (dédupliqué juste après via NOTIFICATION_PRIORITY).
    const mentionedIds = await this.resolveMentions(content, new Set([userId]));
    for (const id of mentionedIds) {
      if (await this.blocksService.isEitherBlocked(userId, id)) continue;
      addCandidate(id, 'mention');
    }

    for (const [recipientId, types] of candidates) {
      const best = NOTIFICATION_PRIORITY.find((t) => types.includes(t)) ?? types[0];
      await this.notificationsService.create(recipientId, userId, best, reviewId);
    }

    return comment;
  }

  async like(commentId: string, userId: string) {
    const comment = await this.prisma.client.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Commentaire introuvable');
    if (await this.blocksService.isEitherBlocked(userId, comment.userId)) {
      throw new ForbiddenException('Action impossible');
    }
    try {
      await this.prisma.client.commentLike.create({ data: { commentId, userId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        return; // déjà liké, idempotent
      }
      throw err;
    }
    await this.notificationsService.create(comment.userId, userId, 'comment_like', comment.reviewId);
  }

  async unlike(commentId: string, userId: string) {
    await this.prisma.client.commentLike.deleteMany({ where: { commentId, userId } });
  }
}
