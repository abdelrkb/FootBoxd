import { Module } from '@nestjs/common';
import { FollowsService } from './follows.service.js';
import { FollowsController } from './follows.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  providers: [FollowsService],
  controllers: [FollowsController],
  exports: [FollowsService],
})
export class FollowsModule {}
