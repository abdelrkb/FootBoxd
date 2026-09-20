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

  findByUsername(username: string) {
    return this.prisma.client.user.findUnique({ where: { username } });
  }

  // Recherche par pseudo (prioritaire) ou nom affiché — un utilisateur qui a oublié le pseudo
  // exact d'un ami mais se souvient de son nom doit quand même pouvoir le retrouver.
  search(query: string) {
    const q = query.trim();
    if (q.length < 2) return [];
    return this.prisma.client.user.findMany({
      where: {
        OR: [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
      take: 20,
      orderBy: { username: 'asc' },
    });
  }

  // Repli pour les comptes créés par OAuth (Google/Apple), qui ne passent pas par RegisterDto
  // et n'ont donc jamais saisi de pseudo — `username` est NOT NULL en base, il en faut un.
  private async generateUniqueUsername(seed: string): Promise<string> {
    const base = seed.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15) || 'user';
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
      if (!(await this.findByUsername(candidate))) return candidate;
    }
    throw new Error('Impossible de générer un pseudo unique');
  }

  findById(id: string) {
    return this.prisma.client.user.findUnique({ where: { id } });
  }

  findByAuthProvider(provider: AuthProviderType, providerUserId: string) {
    return this.prisma.client.authProvider
      .findFirst({ where: { provider, providerUserId }, include: { user: true } })
      .then((row) => row?.user ?? null);
  }

  createWithPassword(email: string, passwordHash: string, displayName: string, username: string) {
    return this.prisma.client.user.create({
      data: {
        email,
        passwordHash,
        username,
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

    const username = await this.generateUniqueUsername(params.displayName);
    return this.prisma.client.user.create({
      data: {
        email: params.email,
        username,
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

    // "Matchs préférés" = les mieux notés par l'utilisateur cette saison (décision produit
    // du 2026-09-17), distinct de "derniers loggés" qui trie par récence.
    const favoriteMatches = [...reviewsThisSeason]
      .sort((a, b) => Number(b.rating) - Number(a.rating))
      .slice(0, 4);

    const [followersCount, followingCount] = await Promise.all([
      this.followsService.countFollowers(userId),
      this.followsService.countFollowing(userId),
    ]);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      totalReviewsCount: activeReviews.length,
      reviewsThisSeasonCount: reviewsThisSeason.length,
      lastReviews: reviewsThisSeason.slice(0, 4),
      favoriteMatches,
      followersCount,
      followingCount,
    };
  }

  // "Club de cœur" (handoff design du 2026-09-20) : une seule équipe favorite, épinglée en
  // haut de l'accueil. `teamId: null` retire le club de cœur.
  setFavoriteTeam(userId: string, teamId: string | null) {
    return this.prisma.client.user.update({ where: { id: userId }, data: { favoriteTeamId: teamId } });
  }

  // Réglages de notification (onboarding, écran "Réglages", 2026-09-20). Décision produit :
  // stockées mais seule hideScoresUntilClick a un effet réel pour l'instant (voir schema.prisma).
  updatePreferences(
    userId: string,
    prefs: Partial<{
      notifyOnLike: boolean;
      notifyOnComment: boolean;
      notifyOnNewFollower: boolean;
      notifyKickoffReminder: boolean;
      hideScoresUntilClick: boolean;
    }>,
  ) {
    return this.prisma.client.user.update({ where: { id: userId }, data: prefs });
  }

  completeOnboarding(userId: string) {
    return this.prisma.client.user.update({ where: { id: userId }, data: { hasCompletedOnboarding: true } });
  }
}
