import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReportDto } from './dto/create-report.dto.js';

// Modération minimale pour le MVP (décision produit du 2026-10-02) : les signalements sont
// seulement stockés, sans interface admin ni file de traitement — consultables via Prisma
// Studio ou une requête SQL directe le temps que le volume le justifie. Voir architecture.md.
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  create(reporterId: string, dto: CreateReportDto) {
    return this.prisma.client.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details,
      },
    });
  }
}
