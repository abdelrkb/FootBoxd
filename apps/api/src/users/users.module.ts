import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { FollowsModule } from '../follows/follows.module.js';
import { LeaguesModule } from '../leagues/leagues.module.js';
import { WatchlistModule } from '../watchlist/watchlist.module.js';
import { BlocksModule } from '../blocks/blocks.module.js';
import { TeamsModule } from '../teams/teams.module.js';

@Module({
  imports: [FollowsModule, LeaguesModule, WatchlistModule, BlocksModule, TeamsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
