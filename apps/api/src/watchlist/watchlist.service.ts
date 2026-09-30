import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const MATCH_INCLUDE = { league: true, homeTeam: true, awayTeam: true } as const;

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  findForUser(userId: string) {
    return this.prisma.client.watchlistEntry.findMany({
      where: { userId },
      include: { match: { include: MATCH_INCLUDE } },
      orderBy: { match: { kickoffAt: 'asc' } },
    });
  }

  async findIdsForUser(userId: string) {
    const entries = await this.prisma.client.watchlistEntry.findMany({ where: { userId }, select: { matchId: true } });
    return entries.map((e) => e.matchId);
  }

  // Consulté depuis le profil d'un autre utilisateur — n'expose la liste que si elle est
  // publique (ou si c'est la sienne propre, mais ce cas passe par findForUser côté front).
  async findPublicForUser(targetUserId: string) {
    const target = await this.prisma.client.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');
    if (!target.isWatchlistPublic) throw new ForbiddenException("Cette watchlist est privée");
    return this.findForUser(targetUserId);
  }

  async add(userId: string, matchId: string) {
    const match = await this.prisma.client.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match introuvable');
    await this.prisma.client.watchlistEntry.upsert({
      where: { userId_matchId: { userId, matchId } },
      create: { userId, matchId },
      update: {},
    });
  }

  async remove(userId: string, matchId: string) {
    await this.prisma.client.watchlistEntry.deleteMany({ where: { userId, matchId } });
  }
}
