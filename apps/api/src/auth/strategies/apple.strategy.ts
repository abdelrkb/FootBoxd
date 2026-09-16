import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type AppleProfile } from 'passport-apple';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { UsersService } from '../../users/users.service.js';

interface AppleIdTokenPayload {
  sub: string;
  email?: string;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly usersService: UsersService) {
    super({
      clientID: process.env.APPLE_CLIENT_ID!,
      teamID: process.env.APPLE_TEAM_ID!,
      keyID: process.env.APPLE_KEY_ID!,
      privateKeyString: process.env.APPLE_PRIVATE_KEY!,
      callbackURL: process.env.APPLE_CALLBACK_URL!,
      passReqToCallback: true,
    });
  }

  // Le "profile" standard passport n'existe pas pour Apple : l'identité vient du idToken
  // (JWT) décodé, et le nom complet n'est fourni par Apple qu'UNE SEULE FOIS, lors de la
  // toute première autorisation, dans req.appleProfile (voir node_modules/passport-apple/
  // src/strategy.js — req.body.user parsé par la lib elle-même). Il n'y a aucun moyen de le
  // récupérer après coup : s'il n'est pas capturé ici au premier login, il est perdu.
  async validate(
    req: Request & { appleProfile?: AppleProfile },
    _accessToken: string,
    _refreshToken: string,
    idToken: string,
  ) {
    const decoded = jwt.decode(idToken) as AppleIdTokenPayload | null;
    if (!decoded?.sub) {
      throw new Error('Apple idToken invalide (sub manquant)');
    }
    const email = decoded.email ?? req.appleProfile?.email;
    if (!email) {
      throw new Error('Apple: aucun email disponible (ni idToken, ni premier login)');
    }
    const firstName = req.appleProfile?.name?.firstName;
    const lastName = req.appleProfile?.name?.lastName;
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || email;

    return this.usersService.findOrCreateFromOAuth({
      provider: 'apple',
      providerUserId: decoded.sub,
      email,
      displayName,
    });
  }
}
