import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { LeaguesService } from './leagues.service.js';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  list() {
    return this.leaguesService.findAll();
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.leaguesService.findById(id);
  }

  @Get(':id/teams')
  teams(@Param('id', ParseUUIDPipe) id: string) {
    return this.leaguesService.findTeams(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/favorite')
  @HttpCode(200)
  async favorite(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: PublicUser) {
    await this.leaguesService.addFavorite(user.id, id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/favorite')
  @HttpCode(200)
  async unfavorite(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: PublicUser) {
    await this.leaguesService.removeFavorite(user.id, id);
    return { success: true };
  }
}
