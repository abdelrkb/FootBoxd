import { Module } from '@nestjs/common';
import { BlocksService } from './blocks.service.js';
import { BlocksController } from './blocks.controller.js';

@Module({
  providers: [BlocksService],
  controllers: [BlocksController],
  exports: [BlocksService],
})
export class BlocksModule {}
