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

  // Recherche par nom (prioritaire) ou pays — mêmes règles que la recherche utilisateurs.
  search(query: string) {
    const q = query.trim();
    if (q.length < 2) return [];
    return this.prisma.client.league.findMany({
      where: {
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { country: { contains: q, mode: 'insensitive' } }],
      },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const league = await this.prisma.client.league.findUnique({ where: { id } });
    if (!league) throw new NotFoundException('Ligue introuvable');
    return league;
  }

  // Classement de la compétition sur sa saison en cours (issue #58). Vide si la ligue n'a pas
  // de saison courante connue ou si le worker n'a pas encore synchronisé de classement — toutes
  // les compétitions n'en ont pas (coupes à élimination directe).
  async getStandings(leagueId: string) {
    const league = await this.findById(leagueId);
    if (!league.currentSeason) return [];

    return this.prisma.client.standing.findMany({
      where: { leagueId, season: league.currentSeason },
      include: { team: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { rank: 'asc' },
    });
  }

  // Calendrier de la compétition (issue #58) : les matchs à venir, toutes dates confondues —
  // la page ligue n'affichait jusqu'ici que la journée sélectionnée dans le carrousel.
  findUpcomingMatches(leagueId: string, limit = 50) {
    return this.prisma.client.match.findMany({
      where: { leagueId, status: { in: ['scheduled', 'postponed', 'suspended'] } },
      include: { league: true, homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: 'asc' },
      take: limit,
    });
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
