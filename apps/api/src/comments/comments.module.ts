import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CommentsController } from './comments.controller.js';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [ReviewsModule, NotificationsModule],
  providers: [CommentsService],
  controllers: [CommentsController],
})
export class CommentsModule {}
