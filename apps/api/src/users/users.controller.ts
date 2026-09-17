import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { LeaguesService } from '../leagues/leagues.service.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly leaguesService: LeaguesService,
  ) {}

  @Get(':id/profile')
  profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/favorite-leagues')
  favoriteLeagues(@Param('id', ParseUUIDPipe) id: string) {
    return this.leaguesService.findFavoritesForUser(id);
  }
}
