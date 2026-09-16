import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';

@Controller('reviews/:reviewId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Param('reviewId', ParseUUIDPipe) reviewId: string) {
    return this.commentsService.findForReview(reviewId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.commentsService.create(reviewId, user.id, dto.content);
  }
}
