import { Module, type Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { AppleStrategy } from './strategies/apple.strategy.js';

// passport-google-oauth20 et passport-apple héritent de passport-oauth2, qui lève une
// TypeError à la construction si `clientID` est vide (voir node_modules/passport-oauth2/
// lib/strategy.js:87). Tant que GOOGLE_CLIENT_ID / APPLE_CLIENT_ID ne sont pas renseignés
// dans .env, on ne les enregistre pas comme providers pour ne pas faire planter tout le
// bootstrap NestJS en dev — /auth/google et /auth/apple répondront juste une erreur
// "Unknown authentication strategy" tant que ce n'est pas configuré.
const oauthProviders: Provider[] = [];
if (process.env.GOOGLE_CLIENT_ID) {
  oauthProviders.push(GoogleStrategy);
}
if (process.env.APPLE_CLIENT_ID) {
  oauthProviders.push(AppleStrategy);
}

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'],
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, ...oauthProviders],
})
export class AuthModule {}
