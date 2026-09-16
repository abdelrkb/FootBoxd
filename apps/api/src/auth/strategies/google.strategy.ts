import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { UsersService } from '../../users/users.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly usersService: UsersService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['email', 'profile'],
    });
  }

  // NB : ne pas appeler `done` ici — le mixin PassportStrategy de @nestjs/passport s'en charge
  // lui-même à partir de la valeur retournée (ou de l'exception levée) par cette méthode.
  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('Google profile has no email');
    }
    return this.usersService.findOrCreateFromOAuth({
      provider: 'google',
      providerUserId: profile.id,
      email,
      displayName: profile.displayName ?? email,
      avatarUrl: profile.photos?.[0]?.value,
    });
  }
}
