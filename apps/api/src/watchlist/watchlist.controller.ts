import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { WatchlistService } from './watchlist.service.js';

@UseGuards(JwtAuthGuard)
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  list(@CurrentUser() user: PublicUser) {
    return this.watchlistService.findForUser(user.id);
  }

  @Get('ids')
  ids(@CurrentUser() user: PublicUser) {
    return this.watchlistService.findIdsForUser(user.id);
  }

  @Post(':matchId')
  @HttpCode(200)
  async add(@Param('matchId', ParseUUIDPipe) matchId: string, @CurrentUser() user: PublicUser) {
    await this.watchlistService.add(user.id, matchId);
    return { success: true };
  }

  @Delete(':matchId')
  @HttpCode(200)
  async remove(@Param('matchId', ParseUUIDPipe) matchId: string, @CurrentUser() user: PublicUser) {
    await this.watchlistService.remove(user.id, matchId);
    return { success: true };
  }
}
