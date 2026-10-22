import { Module } from '@nestjs/common';
import { ProfileAccessService } from './profile-access.service.js';

// Module à part (et non dans UsersModule) pour que FollowsModule puisse l'importer sans
// créer de cycle avec UsersModule.
@Module({
  providers: [ProfileAccessService],
  exports: [ProfileAccessService],
})
export class ProfileAccessModule {}
