import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { FollowsService } from '../follows/follows.service.js';
import { toPublicUser } from './to-public-user.js';
import type { AuthProviderType } from '@football-app/database';
import type { Prisma } from '@football-app/database';

const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/9.x/thumbs/svg?seed=default';
const USERNAME_COOLDOWN_MS = 14 * 24 * 60 * 60_000;
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

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
  // exact d'un ami mais se souvient de son nom doit quand même pouvoir le retrouver. Les
  // comptes supprimés (anonymisés, `deletedAt` non null) sont exclus.
  search(query: string) {
    const q = query.trim();
    if (q.length < 2) return [];
    return this.prisma.client.user.findMany({
      where: {
        deletedAt: null,
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
        // L'email est déjà confirmé par le provider OAuth — pas besoin de notre propre code
        // de vérification (contrairement à l'inscription email/mot de passe).
        emailVerifiedAt: new Date(),
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
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      totalReviewsCount: activeReviews.length,
      reviewsThisSeasonCount: reviewsThisSeason.length,
      // quickRating exclu (issue #15) : une note posée sans ouvrir la fiche n'est pas un "log"
      // — compte dans les stats ci-dessus et peut rester un match préféré, mais pas ici.
      lastReviews: reviewsThisSeason.filter((r) => !r.quickRating).slice(0, 4),
      favoriteMatches,
      followersCount,
      followingCount,
      isWatchlistPublic: user.isWatchlistPublic,
      isPrivate: user.isPrivate,
    };
  }

  // "% de compatibilité" (issue #18, 2026-10-22) : demandé explicitement pour prendre en
  // compte plus que le seul accord de notes — club favori commun ET amis en commun en plus des
  // matchs vus en commun. Chaque signal n'est compté que s'il est réellement mesurable pour CE
  // couple d'utilisateurs (ex: pas de pénalité si l'un des deux n'a pas de club favori) ; la
  // moyenne ne porte que sur les signaux disponibles, pondérés également entre eux — pas de
  // formule officielle à reproduire, choix produit simple et explicable plutôt qu'une pondération
  // arbitraire plus "fine".
  async getCompatibility(viewerId: string, otherId: string) {
    const [viewer, other] = await Promise.all([
      this.prisma.client.user.findUnique({ where: { id: viewerId }, select: { favoriteTeamId: true } }),
      this.prisma.client.user.findUnique({ where: { id: otherId }, select: { favoriteTeamId: true } }),
    ]);
    if (!other) throw new NotFoundException('Utilisateur introuvable');

    const [viewerReviews, otherReviews, viewerFollowing, otherFollowing] = await Promise.all([
      this.prisma.client.review.findMany({ where: { userId: viewerId, deletedAt: null }, select: { matchId: true, rating: true } }),
      this.prisma.client.review.findMany({ where: { userId: otherId, deletedAt: null }, select: { matchId: true, rating: true } }),
      this.followsService.findFollowing(viewerId),
      this.followsService.findFollowing(otherId),
    ]);

    // Rewatch (issue #14) : plusieurs notes actives possibles pour le même match — on moyenne
    // les notes d'un même utilisateur sur un même match avant de comparer.
    function averageRatingByMatch(reviews: { matchId: string; rating: Prisma.Decimal }[]) {
      const sums = new Map<string, { total: number; count: number }>();
      for (const r of reviews) {
        const entry = sums.get(r.matchId) ?? { total: 0, count: 0 };
        entry.total += Number(r.rating);
        entry.count += 1;
        sums.set(r.matchId, entry);
      }
      return new Map(Array.from(sums, ([matchId, { total, count }]) => [matchId, total / count]));
    }

    const viewerByMatch = averageRatingByMatch(viewerReviews);
    const otherByMatch = averageRatingByMatch(otherReviews);
    const commonMatchIds = Array.from(viewerByMatch.keys()).filter((id) => otherByMatch.has(id));

    let ratingAgreementScore: number | null = null;
    if (commonMatchIds.length > 0) {
      const agreeing = commonMatchIds.filter(
        (id) => Math.abs(viewerByMatch.get(id)! - otherByMatch.get(id)!) <= 0.5,
      ).length;
      ratingAgreementScore = (agreeing / commonMatchIds.length) * 100;
    }

    let sameClubScore: number | null = null;
    if (viewer?.favoriteTeamId && other.favoriteTeamId) {
      sameClubScore = viewer.favoriteTeamId === other.favoriteTeamId ? 100 : 0;
    }

    const viewerFollowingIds = new Set(viewerFollowing.map((u) => u.id));
    const otherFollowingIds = new Set(otherFollowing.map((u) => u.id));
    const mutualFriends = Array.from(viewerFollowingIds).filter((id) => otherFollowingIds.has(id)).length;
    let mutualFriendsScore: number | null = null;
    if (viewerFollowingIds.size > 0 && otherFollowingIds.size > 0) {
      mutualFriendsScore = (mutualFriends / Math.min(viewerFollowingIds.size, otherFollowingIds.size)) * 100;
    }

    const availableScores = [ratingAgreementScore, sameClubScore, mutualFriendsScore].filter(
      (s): s is number => s !== null,
    );
    const percentage =
      availableScores.length > 0
        ? Math.round(availableScores.reduce((a, b) => a + b, 0) / availableScores.length)
        : null;

    return {
      percentage,
      commonMatches: commonMatchIds.length,
      sameFavoriteTeam: sameClubScore === 100,
      mutualFriends,
    };
  }

  // "Club de cœur" (handoff design du 2026-09-20) : une seule équipe favorite, épinglée en
  // haut de l'accueil. `teamId: null` retire le club de cœur.
  async setFavoriteTeam(userId: string, teamId: string | null) {
    const user = await this.prisma.client.user.update({ where: { id: userId }, data: { favoriteTeamId: teamId } });
    return toPublicUser(user);
  }

  // Réglages de notification (onboarding, écran "Réglages", 2026-09-20). Décision produit :
  // stockées mais seule hideScoresUntilClick a un effet réel pour l'instant (voir schema.prisma).
  async updatePreferences(
    userId: string,
    prefs: Partial<{
      notifyOnLike: boolean;
      notifyOnComment: boolean;
      notifyOnNewFollower: boolean;
      notifyKickoffReminder: boolean;
      notifyWatchlistKickoff: boolean;
      hideScoresUntilClick: boolean;
    }>,
  ) {
    const user = await this.prisma.client.user.update({ where: { id: userId }, data: prefs });
    return toPublicUser(user);
  }

  async completeOnboarding(userId: string) {
    const user = await this.prisma.client.user.update({ where: { id: userId }, data: { hasCompletedOnboarding: true } });
    return toPublicUser(user);
  }

  async setWatchlistVisibility(userId: string, isPublic: boolean) {
    const user = await this.prisma.client.user.update({ where: { id: userId }, data: { isWatchlistPublic: isPublic } });
    return toPublicUser(user);
  }

  // Profil privé (issue #18) : passer de privé à public ne touche pas aux FollowRequest déjà
  // en attente — elles restent visibles côté notification tant qu'elles ne sont pas traitées,
  // simple et sans surprise (pas de "nettoyage" silencieux de demandes).
  async setProfilePrivacy(userId: string, isPrivate: boolean) {
    const user = await this.prisma.client.user.update({ where: { id: userId }, data: { isPrivate } });
    return toPublicUser(user);
  }

  // --- Compte & sécurité (2026-10-02) ---

  async markEmailVerified(userId: string) {
    const user = await this.prisma.client.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    return toPublicUser(user);
  }

  // Appelé après un reset de mot de passe réussi (voir auth.service.ts) : incrémente
  // `tokenVersion` pour invalider tous les JWT déjà émis (voir jwt.strategy.ts).
  async setPasswordAndInvalidateSessions(userId: string, passwordHash: string) {
    return this.prisma.client.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string | null }) {
    const user = await this.prisma.client.user.update({ where: { id: userId }, data });
    return toPublicUser(user);
  }

  async updateUsername(userId: string, newUsername: string) {
    const current = await this.findById(userId);
    if (!current) throw new NotFoundException('Utilisateur introuvable');

    if (current.usernameChangedAt) {
      const nextAllowedAt = current.usernameChangedAt.getTime() + USERNAME_COOLDOWN_MS;
      if (Date.now() < nextAllowedAt) {
        const daysLeft = Math.ceil((nextAllowedAt - Date.now()) / 86_400_000);
        throw new ForbiddenException(
          `Tu as déjà changé de pseudo récemment — réessaie dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
        );
      }
    }

    if (newUsername === current.username) return toPublicUser(current);

    const existing = await this.findByUsername(newUsername);
    if (existing) throw new BadRequestException('Ce pseudo est déjà pris');

    const user = await this.prisma.client.user.update({
      where: { id: userId },
      data: { username: newUsername, usernameChangedAt: new Date() },
    });
    return toPublicUser(user);
  }

  async uploadAvatar(userId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Format non supporté (jpeg, png ou webp uniquement)');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Image trop lourde (2 Mo maximum)');
    }
    const user = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        avatarData: file.buffer,
        avatarMimeType: file.mimetype,
        // Cache-buster : sans lui, le navigateur et les CDN garderaient l'ancien avatar en
        // cache sur cette même URL après un remplacement.
        avatarUrl: `/users/${userId}/avatar?v=${Date.now()}`,
      },
    });
    return toPublicUser(user);
  }

  async removeAvatar(userId: string) {
    const user = await this.prisma.client.user.update({
      where: { id: userId },
      data: { avatarData: null, avatarMimeType: null, avatarUrl: DEFAULT_AVATAR_URL },
    });
    return toPublicUser(user);
  }

  async getAvatar(userId: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { avatarData: true, avatarMimeType: true },
    });
    if (!user?.avatarData || !user.avatarMimeType) return null;
    return { data: user.avatarData, mimeType: user.avatarMimeType };
  }

  // Suppression de compte = anonymisation (décision produit du 2026-10-02) : le contenu
  // (reviews, commentaires, follows en tant que cible) reste intact pour ne pas casser les fils
  // des autres utilisateurs, seules les données personnelles sont écrasées. `email`/`username`
  // doivent rester uniques en base, d'où les valeurs générées à partir de l'id.
  async deleteAccount(userId: string, password?: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (user.passwordHash) {
      if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new UnauthorizedException('Mot de passe incorrect');
      }
    }

    const shortId = userId.slice(0, 8);
    await this.prisma.client.$transaction([
      this.prisma.client.authProvider.deleteMany({ where: { userId } }),
      this.prisma.client.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.footboxd.invalid`,
          username: `deleted_${shortId}`,
          displayName: 'Utilisateur supprimé',
          bio: null,
          avatarUrl: DEFAULT_AVATAR_URL,
          avatarData: null,
          avatarMimeType: null,
          passwordHash: null,
          favoriteTeamId: null,
          deletedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
      }),
    ]);
  }
}
