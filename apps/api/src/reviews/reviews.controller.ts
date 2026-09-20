import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ListReviewsDto } from './dto/list-reviews.dto.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(@Query() query: ListReviewsDto) {
    return this.reviewsService.findForMatch(query.matchId);
  }

  // Routes littérales AVANT ':id' — sinon NestJS matche "popular"/"following" comme un id
  // (ParseUUIDPipe les rejetterait avec un 400 avant même d'atteindre les bonnes routes).
  @Get('popular')
  popular() {
    return this.reviewsService.findPopular();
  }

  @UseGuards(JwtAuthGuard)
  @Get('following')
  following(@CurrentUser() user: PublicUser) {
    return this.reviewsService.findFromFollowing(user.id);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.findActiveById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: PublicUser) {
    return this.reviewsService.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: PublicUser) {
    await this.reviewsService.softDelete(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReviewDto, @CurrentUser() user: PublicUser) {
    return this.reviewsService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  @HttpCode(200)
  async like(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: PublicUser) {
    await this.reviewsService.like(id, user.id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/like')
  @HttpCode(200)
  async unlike(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: PublicUser) {
    await this.reviewsService.unlike(id, user.id);
    return { success: true };
  }
}
