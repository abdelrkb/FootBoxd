import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { ReportsService } from './reports.service.js';
import { CreateReportDto } from './dto/create-report.dto.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateReportDto, @CurrentUser() user: PublicUser) {
    return this.reportsService.create(user.id, dto);
  }
}
