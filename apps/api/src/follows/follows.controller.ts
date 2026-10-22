import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { FollowsService } from './follows.service.js';
import { ProfileAccessService } from '../users/profile-access.service.js';

@Controller('users/:id')
export class FollowsController {
  constructor(
    private readonly followsService: FollowsService,
    private readonly profileAccess: ProfileAccessService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('follow')
  @HttpCode(200)
  async follow(@Param('id', ParseUUIDPipe) targetId: string, @CurrentUser() user: PublicUser) {
    return this.followsService.follow(user.id, targetId);
  }

  // :id = l'auteur de la demande (le user courant, destinataire de la notification, est
  // toujours l'owner) — même convention que 'follow'/'unfollow' où :id est l'AUTRE personne.
  @UseGuards(JwtAuthGuard)
  @Post('accept-follow-request')
  @HttpCode(200)
  async acceptFollowRequest(@Param('id', ParseUUIDPipe) requesterId: string, @CurrentUser() user: PublicUser) {
    await this.followsService.acceptFollowRequest(user.id, requesterId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('reject-follow-request')
  @HttpCode(200)
  async rejectFollowRequest(@Param('id', ParseUUIDPipe) requesterId: string, @CurrentUser() user: PublicUser) {
    await this.followsService.rejectFollowRequest(user.id, requesterId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('follow')
  @HttpCode(200)
  async unfollow(@Param('id', ParseUUIDPipe) targetId: string, @CurrentUser() user: PublicUser) {
    await this.followsService.unfollow(user.id, targetId);
    return { success: true };
  }

  // Listes consultables sur n'importe quel profil (issue #54), sauf compte privé auquel le
  // visiteur n'a pas accès. Chaque personne est annotée de sa relation avec le visiteur.
  @UseGuards(OptionalJwtAuthGuard)
  @Get('followers')
  async followers(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() viewer?: PublicUser) {
    await this.profileAccess.assertCanViewContent(viewer?.id ?? null, id);
    return this.followsService.withViewerRelation(viewer?.id ?? null, await this.followsService.findFollowers(id));
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('following')
  async following(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() viewer?: PublicUser) {
    await this.profileAccess.assertCanViewContent(viewer?.id ?? null, id);
    return this.followsService.withViewerRelation(viewer?.id ?? null, await this.followsService.findFollowing(id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('am-i-following')
  async amIFollowing(@Param('id', ParseUUIDPipe) targetId: string, @CurrentUser() user: PublicUser) {
    // incomingRequest = targetId m'a envoyé une demande (profil privé, voir issue #18) —
    // affiché avec Accepter/Refuser sur SON profil (profile/[id]/page.tsx).
    const [following, pendingRequest, incomingRequest] = await Promise.all([
      this.followsService.isFollowing(user.id, targetId),
      this.followsService.hasPendingRequest(user.id, targetId),
      this.followsService.hasPendingRequest(targetId, user.id),
    ]);
    return { following, pendingRequest, incomingRequest };
  }
}
