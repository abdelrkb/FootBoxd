import { Module } from '@nestjs/common';
import { WatchlistService } from './watchlist.service.js';
import { WatchlistController } from './watchlist.controller.js';

@Module({
  providers: [WatchlistService],
  controllers: [WatchlistController],
  exports: [WatchlistService],
})
export class WatchlistModule {}
