import { Controller, Delete, Get, HttpCode, Body, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
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
    return this.commentsService.create(reviewId, user.id, dto.content, dto.parentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':commentId/like')
  @HttpCode(200)
  async like(@Param('commentId', ParseUUIDPipe) commentId: string, @CurrentUser() user: PublicUser) {
    await this.commentsService.like(commentId, user.id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':commentId/like')
  @HttpCode(200)
  async unlike(@Param('commentId', ParseUUIDPipe) commentId: string, @CurrentUser() user: PublicUser) {
    await this.commentsService.unlike(commentId, user.id);
    return { success: true };
  }
}
