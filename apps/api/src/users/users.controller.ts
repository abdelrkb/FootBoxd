import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UsersService } from './users.service.js';
import { LeaguesService } from '../leagues/leagues.service.js';
import { WatchlistService } from '../watchlist/watchlist.service.js';
import { BlocksService } from '../blocks/blocks.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { PublicUser } from '../auth/auth.service.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { SetFavoriteTeamDto } from './dto/set-favorite-team.dto.js';
import { SetWatchlistVisibilityDto } from './dto/set-watchlist-visibility.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

// Juste le sous-ensemble de `Express.Multer.File` réellement utilisé (voir
// users.service.ts `uploadAvatar`) — évite une dépendance à `@types/multer` pour un seul champ
// de type, `@UploadedFile()` extrait de toute façon la valeur sans se soucier du type déclaré.
interface UploadedAvatarFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
import { UpdateUsernameDto } from './dto/update-username.dto.js';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly leaguesService: LeaguesService,
    private readonly watchlistService: WatchlistService,
    private readonly blocksService: BlocksService,
  ) {}

  @Get('search')
  search(@Query('q') q = '') {
    return this.usersService.search(q);
  }

  @Get(':id/profile')
  profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/favorite-leagues')
  favoriteLeagues(@Param('id', ParseUUIDPipe) id: string) {
    return this.leaguesService.findFavoritesForUser(id);
  }

  // Watchlist d'un autre utilisateur — 403 si elle n'est pas publique (voir WatchlistService).
  @Get(':id/watchlist')
  userWatchlist(@Param('id', ParseUUIDPipe) id: string) {
    return this.watchlistService.findPublicForUser(id);
  }

  // Octets de l'avatar stocké en base (2026-10-02, pas de Cloudflare R2 disponible — voir
  // architecture.md section 8). Public : une balise <img src> ne peut pas envoyer de cookie
  // d'auth. `?v=` (posé par uploadAvatar) sert de cache-buster, donc le cache navigateur/proxy
  // peut être agressif ici.
  @Get(':id/avatar')
  async avatar(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const avatar = await this.usersService.getAvatar(id);
    if (!avatar) throw new NotFoundException('Pas d\'avatar personnalisé');
    res.set('Content-Type', avatar.mimeType).set('Cache-Control', 'public, max-age=31536000, immutable').send(avatar.data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/favorite-team')
  setFavoriteTeam(@Body() dto: SetFavoriteTeamDto, @CurrentUser() user: PublicUser) {
    return this.usersService.setFavoriteTeam(user.id, dto.teamId ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/preferences')
  updatePreferences(@Body() dto: UpdatePreferencesDto, @CurrentUser() user: PublicUser) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/complete-onboarding')
  @HttpCode(200)
  completeOnboarding(@CurrentUser() user: PublicUser) {
    return this.usersService.completeOnboarding(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/watchlist-visibility')
  setWatchlistVisibility(@Body() dto: SetWatchlistVisibilityDto, @CurrentUser() user: PublicUser) {
    return this.usersService.setWatchlistVisibility(user.id, dto.isPublic);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: PublicUser) {
    return this.usersService.updateProfile(user.id, { displayName: dto.displayName, bio: dto.bio === '' ? null : dto.bio });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/username')
  updateUsername(@Body() dto: UpdateUsernameDto, @CurrentUser() user: PublicUser) {
    return this.usersService.updateUsername(user.id, dto.username);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: AVATAR_MAX_BYTES } }))
  uploadAvatar(@UploadedFile() file: UploadedAvatarFile, @CurrentUser() user: PublicUser) {
    return this.usersService.uploadAvatar(user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/avatar')
  removeAvatar(@CurrentUser() user: PublicUser) {
    return this.usersService.removeAvatar(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/blocked-accounts')
  blockedAccounts(@CurrentUser() user: PublicUser) {
    return this.blocksService.findBlockedUsers(user.id);
  }
}
