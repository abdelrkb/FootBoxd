import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { BlocksService } from './blocks.service.js';

@Controller('users/:id')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @UseGuards(JwtAuthGuard)
  @Post('block')
  @HttpCode(200)
  async block(@Param('id', ParseUUIDPipe) targetId: string, @CurrentUser() user: PublicUser) {
    await this.blocksService.block(user.id, targetId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('block')
  @HttpCode(200)
  async unblock(@Param('id', ParseUUIDPipe) targetId: string, @CurrentUser() user: PublicUser) {
    await this.blocksService.unblock(user.id, targetId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('block-status')
  blockStatus(@Param('id', ParseUUIDPipe) targetId: string, @CurrentUser() user: PublicUser) {
    return this.blocksService.getBlockStatus(user.id, targetId);
  }
}
