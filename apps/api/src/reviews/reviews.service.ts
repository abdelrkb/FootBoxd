import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@football-app/database';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { BlocksService } from '../blocks/blocks.service.js';
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
    private readonly blocksService: BlocksService,
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
    if (match.status !== 'finished') {
      throw new ForbiddenException("Ce match n'est pas encore terminé");
    }

    const tagIds = await this.resolveTagIds(dto.tags);

    // "Reloguer ce match" (issue #14) : plus de contrainte d'unicité user+match (voir
    // schema.prisma) — watchNumber compte les visionnages actifs déjà loggés par CET
    // utilisateur sur CE match, +1. Pas recalculé si une review plus ancienne est supprimée
    // ensuite (voir le commentaire sur le champ dans schema.prisma).
    const previousWatches = await this.prisma.client.review.count({
      where: { userId, matchId: dto.matchId, deletedAt: null },
    });

    const review = await this.prisma.client.review.create({
      data: {
        userId,
        matchId: dto.matchId,
        rating: dto.rating,
        comment: dto.comment,
        watchNumber: previousWatches + 1,
        quickRating: dto.quickRating ?? false,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      include: reviewInclude,
    });
    return serializeReview(review);
  }

  async findForMatch(matchId: string) {
    const reviews = await this.prisma.client.review.findMany({
      where: { matchId, deletedAt: null },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map(serializeReview);
  }

  // Inclut le match : la page d'une review (web `/reviews/[id]`) affiche son en-tête.
  async findActiveById(id: string) {
    const review = await this.prisma.client.review.findUnique({ where: { id }, include: reviewWithMatchInclude });
    if (!review || review.deletedAt) throw new NotFoundException('Review introuvable');
    return serializeReview(review);
  }

  async findDetail(id: string, viewerId: string | null) {
    const review = await this.findActiveById(id);
    const likedByMe = viewerId
      ? (await this.prisma.client.reviewLike.count({ where: { reviewId: id, userId: viewerId } })) > 0
      : false;
    return { ...review, likedByMe };
  }

  async softDelete(id: string, userId: string) {
    const review = await this.prisma.client.review.findUnique({ where: { id } });
    if (!review || review.deletedAt) throw new NotFoundException('Review introuvable');
    if (review.userId !== userId) throw new ForbiddenException("Cette review n'est pas la vôtre");

    await this.prisma.client.review.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // "Matchs préférés" choisis à la main (issue #51) : on épingle une de ses propres reviews.
  // Idempotent — réépingler une review déjà préférée ne change pas sa date d'ajout, donc pas
  // son rang sur le profil.
  async setFavorite(id: string, userId: string, favorite: boolean) {
    const review = await this.prisma.client.review.findUnique({ where: { id } });
    if (!review || review.deletedAt) throw new NotFoundException('Review introuvable');
    if (review.userId !== userId) throw new ForbiddenException("Cette review n'est pas la vôtre");
    if (favorite && review.favoritedAt) return;

    await this.prisma.client.review.update({
      where: { id },
      data: { favoritedAt: favorite ? new Date() : null },
    });
  }

  // Liste paginée des reviews d'un utilisateur (issues #51 et #56) : sert au sélecteur de
  // matchs préférés et à la page "matchs notés" ouverte depuis les stats du profil.
  // `scope: 'season'` ne garde que la saison en cours des compétitions concernées — même
  // définition que les stats du profil (voir UsersService.getProfile).
  async findForUser(userId: string, { scope, page, pageSize }: { scope: 'all' | 'season'; page: number; pageSize: number }) {
    const all = await this.prisma.client.review.findMany({
      where: { userId, deletedAt: null },
      include: reviewWithMatchInclude,
      orderBy: { createdAt: 'desc' },
    });
    const filtered =
      scope === 'season'
        ? all.filter((r) => r.match.league.currentSeason !== null && r.match.season === r.match.league.currentSeason)
        : all;

    return {
      items: filtered.slice(page * pageSize, page * pageSize + pageSize).map(serializeReview),
      total: filtered.length,
    };
  }

  // "Modifier ma note" (handoff design du 2026-09-20, menu ··· sur sa propre review).
  // `tags` absent = tags inchangés ; `tags` présent (même vide) = remplace l'ensemble des tags.
  // `quickRating` (issue #15) : absent = inchangé, false explicite = "compléter ma note rapide"
  // (la review rejoint les flux de logs en même temps qu'on lui ajoute un commentaire).
  async update(
    id: string,
    userId: string,
    data: { rating?: number; comment?: string; tags?: TagInputDto[]; quickRating?: boolean },
  ) {
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
      data: { rating: data.rating, comment: data.comment, quickRating: data.quickRating, ...tagsUpdate },
      include: reviewInclude,
    });
    return serializeReview(updated);
  }

  async like(reviewId: string, userId: string) {
    const review = await this.findActiveById(reviewId);
    if (await this.blocksService.isEitherBlocked(userId, review.user.id)) {
      throw new ForbiddenException('Action impossible');
    }
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
    // quickRating exclu (issue #15) : une note posée depuis une mini-card n'est pas un "log"
    // et ne doit pas apparaître dans ce flux, même avec des likes/commentaires.
    const candidates = await this.prisma.client.review.findMany({
      where: { deletedAt: null, createdAt: { gte: since }, quickRating: false },
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
    // quickRating exclu (issue #15), même raison que findPopular.
    const reviews = await this.prisma.client.review.findMany({
      where: {
        deletedAt: null,
        quickRating: false,
        user: { followers: { some: { followerId: userId } } },
      },
      include: reviewWithMatchInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return reviews.map(serializeReview);
  }
}
