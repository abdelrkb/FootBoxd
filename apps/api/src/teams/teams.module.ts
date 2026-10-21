import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service.js';
import { TeamsController } from './teams.controller.js';

@Module({
  providers: [TeamsService],
  controllers: [TeamsController],
})
export class TeamsModule {}
