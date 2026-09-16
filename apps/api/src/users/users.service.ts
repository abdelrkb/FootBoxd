import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FollowsService } from '../follows/follows.service.js';
import type { AuthProviderType } from '@football-app/database';

const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/9.x/thumbs/svg?seed=default';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followsService: FollowsService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.client.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.client.user.findUnique({ where: { id } });
  }

  findByAuthProvider(provider: AuthProviderType, providerUserId: string) {
    return this.prisma.client.authProvider
      .findFirst({ where: { provider, providerUserId }, include: { user: true } })
      .then((row) => row?.user ?? null);
  }

  createWithPassword(email: string, passwordHash: string, displayName: string) {
    return this.prisma.client.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        avatarUrl: DEFAULT_AVATAR_URL,
        authProviders: {
          create: { provider: 'email', providerUserId: email },
        },
      },
    });
  }

  // Lie un provider OAuth (Google/Apple) à un compte existant (même email) ou en crée un nouveau.
  // L'auth_providers séparé de `users` dans le modèle de données (section 6) suppose explicitement
  // qu'un même user peut être relié à plusieurs providers — d'où le linking par email ici.
  async findOrCreateFromOAuth(params: {
    provider: AuthProviderType;
    providerUserId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }) {
    const existingLink = await this.findByAuthProvider(params.provider, params.providerUserId);
    if (existingLink) return existingLink;

    const existingUser = await this.findByEmail(params.email);
    if (existingUser) {
      await this.prisma.client.authProvider.create({
        data: {
          userId: existingUser.id,
          provider: params.provider,
          providerUserId: params.providerUserId,
        },
      });
      return existingUser;
    }

    return this.prisma.client.user.create({
      data: {
        email: params.email,
        displayName: params.displayName,
        avatarUrl: params.avatarUrl ?? DEFAULT_AVATAR_URL,
        authProviders: {
          create: { provider: params.provider, providerUserId: params.providerUserId },
        },
      },
    });
  }

  // Écran Profil (section 7). "Saison en cours" = league.currentSeason, alimenté par le
  // worker (voir architecture.md section 8) — pas de comparaison de colonnes via relation
  // possible nativement en Prisma, donc filtrage en mémoire (volume par utilisateur trivial).
  async getProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const activeReviews = await this.prisma.client.review.findMany({
      where: { userId, deletedAt: null },
      include: {
        match: { include: { league: true, homeTeam: true, awayTeam: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const reviewsThisSeason = activeReviews.filter(
      (r) => r.match.league.currentSeason !== null && r.match.season === r.match.league.currentSeason,
    );

    const [followersCount, followingCount] = await Promise.all([
      this.followsService.countFollowers(userId),
      this.followsService.countFollowing(userId),
    ]);

    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      totalReviewsCount: activeReviews.length,
      reviewsThisSeasonCount: reviewsThisSeason.length,
      lastReviews: reviewsThisSeason.slice(0, 4),
      followersCount,
      followingCount,
    };
  }
}
