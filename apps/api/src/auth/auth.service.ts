import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { toPublicUser } from '../users/to-public-user.js';
import type { PublicUser } from '../users/to-public-user.js';

const BCRYPT_SALT_ROUNDS = 12;

// Réexporté ici : tous les contrôleurs importent `PublicUser` depuis auth.service.ts (usage
// historique, ex. `@CurrentUser() user: PublicUser`) — le type vit désormais dans
// to-public-user.ts pour être utilisable côté users.service.ts sans import circulaire.
export type { PublicUser };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, displayName: string, username: string): Promise<PublicUser> {
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }
    const existingUsername = await this.usersService.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Ce pseudo est déjà pris');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.createWithPassword(email, passwordHash, displayName, username);
    return toPublicUser(user);
  }

  // Utilisé par LocalStrategy (passport-local)
  async validateLocalUser(email: string, password: string): Promise<PublicUser> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return toPublicUser(user);
  }

  issueToken(user: PublicUser): string {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }
}
