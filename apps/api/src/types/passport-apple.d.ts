// passport-apple ne publie aucun typage (vérifié dans node_modules/passport-apple : pas de .d.ts).
// Déclaration minimale couvrant uniquement ce qu'on utilise réellement dans apple.strategy.ts.
declare module 'passport-apple' {
  import { Request } from 'express';

  export interface AppleStrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    callbackURL: string;
    privateKeyString?: string;
    privateKeyLocation?: string;
    passReqToCallback?: boolean;
  }

  export interface AppleProfile {
    name?: { firstName?: string; lastName?: string };
    email?: string;
  }

  export type AppleVerifyCallback = (
    req: Request & { appleProfile?: AppleProfile },
    accessToken: string,
    refreshToken: string,
    idToken: string,
    _profilePlaceholder: unknown,
    done: (error: unknown, user?: unknown) => void,
  ) => void;

  export class Strategy {
    name: string;
    constructor(options: AppleStrategyOptions, verify: AppleVerifyCallback);
  }
}
