import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type StrategyOptionsWithoutRequest } from 'passport-jwt';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service.js';
import { toPublicUser } from '../../users/to-public-user.js';

const COOKIE_NAME = 'access_token';

function extractJwtFromCookie(req: Request): string | null {
  return req?.cookies?.[COOKIE_NAME] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    super({
      jwtFromRequest: extractJwtFromCookie,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    } satisfies StrategyOptionsWithoutRequest);
  }

  async validate(payload: { sub: string; tokenVersion: number }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) return null;
    // Compte supprimé (anonymisé, voir users.service.ts `deleteAccount`) : plus de session
    // possible, même avec un JWT non expiré.
    if (user.deletedAt) return null;
    // `tokenVersion` incrémenté au changement de mot de passe / à la suppression de compte
    // (2026-10-02) : un JWT émis avant cet incrément ne correspond plus à la version courante,
    // donc invalidé immédiatement sans avoir à tenir de liste de révocation.
    if (user.tokenVersion !== payload.tokenVersion) return null;
    return toPublicUser(user);
  }
}
