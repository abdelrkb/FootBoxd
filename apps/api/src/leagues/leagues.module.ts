import { Module } from '@nestjs/common';
import { LeaguesService } from './leagues.service.js';
import { LeaguesController } from './leagues.controller.js';

@Module({
  providers: [LeaguesService],
  controllers: [LeaguesController],
  exports: [LeaguesService],
})
export class LeaguesModule {}
