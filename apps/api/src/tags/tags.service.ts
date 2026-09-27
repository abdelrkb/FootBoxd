import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  // Liste complète triée par nom — le filtrage par saisie se fait côté front (autocomplete
  // du champ Tag, décision produit du 27/09 : peu de tags attendus, pas besoin d'un vrai
  // search-as-you-type serveur pour l'instant).
  findAll() {
    return this.prisma.client.tag.findMany({ orderBy: { name: 'asc' } });
  }
}
