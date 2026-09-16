import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const matchInclude = {
  league: true,
  homeTeam: true,
  awayTeam: true,
} as const;

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  // Un jour donné du calendrier (section 7 : navigable jusqu'à +5 jours), groupé par ligue
  // côté client à partir de `league` inclus sur chaque match.
  findByDate(date: string, leagueId?: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    return this.prisma.client.match.findMany({
      where: {
        kickoffAt: { gte: dayStart, lte: dayEnd },
        ...(leagueId ? { leagueId } : {}),
      },
      include: matchInclude,
      orderBy: [{ league: { name: 'asc' } }, { kickoffAt: 'asc' }],
    });
  }

  async findById(id: string) {
    const match = await this.prisma.client.match.findUnique({
      where: { id },
      include: matchInclude,
    });
    if (!match) throw new NotFoundException('Match introuvable');
    return match;
  }
}
