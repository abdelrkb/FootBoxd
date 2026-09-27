import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@football-app/database';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { TagInputDto } from './dto/tag-input.dto.js';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

const DEFAULT_TAG_COLOR = '#6C63FF';

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
  tags: { include: { tag: true } },
} as const;

type ReviewTagsShape = { tags: Array<{ tag: { id: string; name: string; color: string; colorEnd: string | null } }> };

// Le front reçoit `tags: Tag[]` à plat (pas la ligne de jointure `ReviewTag`) — voir
// shared-types `Review.tags`.
function serializeReview<T extends ReviewTagsShape>(review: T) {
  return {
    ...review,
    tags: review.tags.map((rt) => rt.tag).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

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

  // Un tag est partagé entre tous les users (autocomplete + réutilisation de sa couleur) :
  // - id fourni -> tag existant, réutilisé tel quel (couleur/nom ignorés, on ne réattribue pas
  //   la couleur d'un tag déjà en base à chaque review).
  // - pas d'id -> recherche par nom insensible à la casse ; trouvé -> réutilisé ; sinon créé
  //   avec la couleur choisie dans le color-picker (ou une couleur par défaut).
  private async resolveTagIds(tags: TagInputDto[] | undefined): Promise<string[]> {
    if (!tags || tags.length === 0) return [];
    const ids = new Set<string>();
    for (const input of tags) {
      if (input.id) {
        const existing = await this.prisma.client.tag.findUnique({ where: { id: input.id } });
        if (!existing) throw new NotFoundException(`Tag introuvable : ${input.id}`);
        ids.add(existing.id);
        continue;
      }

      const name = input.name.trim();
      if (!name) continue;

      const existing = await this.prisma.client.tag.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (existing) {
        ids.add(existing.id);
        continue;
      }

      const created = await this.prisma.client.tag.create({
        data: { name, color: input.color ?? DEFAULT_TAG_COLOR, colorEnd: input.colorEnd },
      });
      ids.add(created.id);
    }
    return Array.from(ids);
  }

  async create(userId: string, dto: CreateReviewDto) {
    assertValidRating(dto.rating);

    const match = await this.prisma.client.match.findUnique({ where: { id: dto.matchId } });
    if (!match) throw new NotFoundException('Match introuvable');

    const tagIds = await this.resolveTagIds(dto.tags);

    try {
      const review = await this.prisma.client.review.create({
        data: {
          userId,
          matchId: dto.matchId,
          rating: dto.rating,
          comment: dto.comment,
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
        include: reviewInclude,
      });
      return serializeReview(review);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        throw new ConflictException('Vous avez déjà noté ce match');
      }
      throw err;
    }
  }

  async findForMatch(matchId: string) {
    const reviews = await this.prisma.client.review.findMany({
      where: { matchId, deletedAt: null },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map(serializeReview);
  }

  async findActiveById(id: string) {
    const review = await this.prisma.client.review.findUnique({ where: { id }, include: reviewInclude });
    if (!review || review.deletedAt) throw new NotFoundException('Review introuvable');
    return serializeReview(review);
  }

  async softDelete(id: string, userId: string) {
    const review = await this.prisma.client.review.findUnique({ where: { id } });
    if (!review || review.deletedAt) throw new NotFoundException('Review introuvable');
    if (review.userId !== userId) throw new ForbiddenException("Cette review n'est pas la vôtre");

    await this.prisma.client.review.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // "Modifier ma note" (handoff design du 2026-09-20, menu ··· sur sa propre review).
  // `tags` absent = tags inchangés ; `tags` présent (même vide) = remplace l'ensemble des tags.
  async update(id: string, userId: string, data: { rating?: number; comment?: string; tags?: TagInputDto[] }) {
    const review = await this.prisma.client.review.findUnique({ where: { id } });
    if (!review || review.deletedAt) throw new NotFoundException('Review introuvable');
    if (review.userId !== userId) throw new ForbiddenException("Cette review n'est pas la vôtre");
    if (data.rating !== undefined) assertValidRating(data.rating);

    const tagsUpdate =
      data.tags === undefined
        ? {}
        : { tags: { deleteMany: {}, create: (await this.resolveTagIds(data.tags)).map((tagId) => ({ tagId })) } };

    const updated = await this.prisma.client.review.update({
      where: { id },
      data: { rating: data.rating, comment: data.comment, ...tagsUpdate },
      include: reviewInclude,
    });
    return serializeReview(updated);
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
      .map((review) => ({ ...serializeReview(review), popularityScore: popularityScore(review._count) }))
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  }

  // "Mes amis" = les utilisateurs que je suis (section 6 : follows). Pas de fenêtre temporelle
  // ici, juste les N plus récentes (contrairement à "populaire" qui est borné à 48h).
  async findFromFollowing(userId: string, limit = 10) {
    const reviews = await this.prisma.client.review.findMany({
      where: {
        deletedAt: null,
        user: { followers: { some: { followerId: userId } } },
      },
      include: reviewWithMatchInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return reviews.map(serializeReview);
  }
}
