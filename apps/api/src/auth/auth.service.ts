import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { toPublicUser } from '../users/to-public-user.js';
import type { PublicUser } from '../users/to-public-user.js';
import { VerificationCodeService } from './verification-code.service.js';
import { EmailService } from '../email/email.service.js';

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
    private readonly verificationCodeService: VerificationCodeService,
    private readonly emailService: EmailService,
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

    // Compte email/mot de passe (contrairement à OAuth, déjà vérifié par le provider) : envoie
    // un premier code de confirmation, mais n'empêche pas l'utilisation du compte en attendant
    // (décision produit du 2026-10-02 — un bandeau de rappel suffit côté front).
    const code = await this.verificationCodeService.issue(user.id, 'email_verification');
    await this.emailService.sendVerificationCode(user.email, code);

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

  async verifyEmail(userId: string, code: string): Promise<PublicUser> {
    await this.verificationCodeService.verify(userId, 'email_verification', code);
    return this.usersService.markEmailVerified(userId);
  }

  async resendVerificationCode(user: PublicUser): Promise<void> {
    if (user.emailVerifiedAt) return; // idempotent, rien à renvoyer
    const code = await this.verificationCodeService.issue(user.id, 'email_verification');
    await this.emailService.sendVerificationCode(user.email, code);
  }

  // Ne révèle jamais si l'email existe ou non (anti-énumération de comptes) — le contrôleur
  // renvoie toujours la même réponse générique, que cette méthode envoie un code ou ne fasse
  // rien.
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;
    const code = await this.verificationCodeService.issue(user.id, 'password_reset');
    await this.emailService.sendPasswordResetCode(user.email, code);
  }

  // Fonctionne aussi pour un compte créé par OAuth sans mot de passe : compléter le code reçu
  // par email (déjà prouvé comme lui appartenant) lui permet de DÉFINIR un premier mot de passe
  // et donc, ensuite, de se connecter aussi en email/mot de passe — comportement volontaire,
  // pas seulement une "récupération".
  async resetPassword(email: string, code: string, newPassword: string): Promise<PublicUser> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('Code invalide ou expiré');

    await this.verificationCodeService.verify(user.id, 'password_reset', code);
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    const updated = await this.usersService.setPasswordAndInvalidateSessions(user.id, passwordHash);
    return toPublicUser(updated);
  }

  async deleteAccount(userId: string, password?: string): Promise<void> {
    await this.usersService.deleteAccount(userId, password);
  }

  issueToken(user: PublicUser): string {
    return this.jwtService.sign({ sub: user.id, email: user.email, tokenVersion: user.tokenVersion });
  }
}
