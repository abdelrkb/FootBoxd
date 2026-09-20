import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@football-app/database';
import { PrismaService } from '../prisma/prisma.service.js';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class LeaguesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.league.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const league = await this.prisma.client.league.findUnique({ where: { id } });
    if (!league) throw new NotFoundException('Ligue introuvable');
    return league;
  }

  findFavoritesForUser(userId: string) {
    return this.prisma.client.favoriteLeague
      .findMany({ where: { userId }, include: { league: true } })
      .then((rows) => rows.map((r) => r.league));
  }

  async addFavorite(userId: string, leagueId: string) {
    await this.findById(leagueId);
    try {
      await this.prisma.client.favoriteLeague.create({ data: { userId, leagueId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        return; // déjà en favori, idempotent
      }
      throw err;
    }
  }

  async removeFavorite(userId: string, leagueId: string) {
    await this.prisma.client.favoriteLeague.deleteMany({ where: { userId, leagueId } });
  }

  // Étape "club de cœur" de l'onboarding (2026-09-20) : les équipes ne sont pas rattachées
  // directement à une ligue en base (seulement via les matchs), donc on dérive la liste depuis
  // les matchs déjà synchronisés de cette ligue plutôt que d'ajouter une relation dédiée.
  async findTeams(leagueId: string) {
    await this.findById(leagueId);
    const matches = await this.prisma.client.match.findMany({
      where: { leagueId },
      select: { homeTeam: true, awayTeam: true },
    });
    const teamsById = new Map<string, (typeof matches)[number]['homeTeam']>();
    for (const m of matches) {
      teamsById.set(m.homeTeam.id, m.homeTeam);
      teamsById.set(m.awayTeam.id, m.awayTeam);
    }
    return Array.from(teamsById.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
}
