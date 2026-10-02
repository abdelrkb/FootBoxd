import { Module } from '@nestjs/common';
import { FollowsService } from './follows.service.js';
import { FollowsController } from './follows.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { BlocksModule } from '../blocks/blocks.module.js';

@Module({
  imports: [NotificationsModule, BlocksModule],
  providers: [FollowsService],
  controllers: [FollowsController],
  exports: [FollowsService],
})
export class FollowsModule {}
