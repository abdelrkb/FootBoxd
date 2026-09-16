import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { FollowsService } from './follows.service.js';

@Controller('users/:id')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('follow')
  @HttpCode(200)
  async follow(@Param('id', ParseUUIDPipe) targetId: string, @CurrentUser() user: PublicUser) {
    await this.followsService.follow(user.id, targetId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('follow')
  @HttpCode(200)
  async unfollow(@Param('id', ParseUUIDPipe) targetId: string, @CurrentUser() user: PublicUser) {
    await this.followsService.unfollow(user.id, targetId);
    return { success: true };
  }

  @Get('followers')
  followers(@Param('id', ParseUUIDPipe) id: string) {
    return this.followsService.findFollowers(id);
  }

  @Get('following')
  following(@Param('id', ParseUUIDPipe) id: string) {
    return this.followsService.findFollowing(id);
  }
}
