import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { NotificationsService } from './notifications.service.js';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: PublicUser) {
    return this.notificationsService.findForUser(user.id);
  }

  // Route littérale AVANT ':id/read' — "read-all" ne doit pas être capturé par ParseUUIDPipe.
  @Patch('read-all')
  @HttpCode(200)
  async markAllAsRead(@CurrentUser() user: PublicUser) {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true };
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: PublicUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
