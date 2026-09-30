import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { LeaguesService } from '../leagues/leagues.service.js';
import { WatchlistService } from '../watchlist/watchlist.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { SetFavoriteTeamDto } from './dto/set-favorite-team.dto.js';
import { SetWatchlistVisibilityDto } from './dto/set-watchlist-visibility.dto.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly leaguesService: LeaguesService,
    private readonly watchlistService: WatchlistService,
  ) {}

  @Get('search')
  search(@Query('q') q = '') {
    return this.usersService.search(q);
  }

  @Get(':id/profile')
  profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/favorite-leagues')
  favoriteLeagues(@Param('id', ParseUUIDPipe) id: string) {
    return this.leaguesService.findFavoritesForUser(id);
  }

  // Watchlist d'un autre utilisateur — 403 si elle n'est pas publique (voir WatchlistService).
  @Get(':id/watchlist')
  userWatchlist(@Param('id', ParseUUIDPipe) id: string) {
    return this.watchlistService.findPublicForUser(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/favorite-team')
  setFavoriteTeam(@Body() dto: SetFavoriteTeamDto, @CurrentUser() user: PublicUser) {
    return this.usersService.setFavoriteTeam(user.id, dto.teamId ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/preferences')
  updatePreferences(@Body() dto: UpdatePreferencesDto, @CurrentUser() user: PublicUser) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/complete-onboarding')
  @HttpCode(200)
  completeOnboarding(@CurrentUser() user: PublicUser) {
    return this.usersService.completeOnboarding(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/watchlist-visibility')
  setWatchlistVisibility(@Body() dto: SetWatchlistVisibilityDto, @CurrentUser() user: PublicUser) {
    return this.usersService.setWatchlistVisibility(user.id, dto.isPublic);
  }
}
