import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { BlocksModule } from '../blocks/blocks.module.js';

@Module({
  imports: [NotificationsModule, BlocksModule],
  providers: [ReviewsService],
  controllers: [ReviewsController],
  exports: [ReviewsService],
})
export class ReviewsModule {}
