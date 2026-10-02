import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { VerificationCodePurpose } from '@football-app/database';

const CODE_LENGTH = 6;
const CODE_TTL_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;
const HASH_ROUNDS = 10; // code court-vécu, pas besoin du coût bcrypt d'un mot de passe (12)

function generateCode(): string {
  return randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, '0');
}

// Un seul service pour les deux usages (vérification d'email, reset de mot de passe) — voir
// schema.prisma, modèle VerificationCode. Le code en clair n'existe que le temps de cet appel
// (retourné à `issue()` pour que l'appelant l'envoie par email), jamais persisté.
@Injectable()
export class VerificationCodeService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(userId: string, purpose: VerificationCodePurpose): Promise<string> {
    const mostRecent = await this.prisma.client.verificationCode.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (mostRecent && !mostRecent.consumedAt && Date.now() - mostRecent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new HttpException('Merci de patienter avant de redemander un code', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, HASH_ROUNDS);
    await this.prisma.client.verificationCode.create({
      data: { userId, purpose, codeHash, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });
    return code;
  }

  // Lève une BadRequestException générique ("Code invalide ou expiré") dans tous les cas
  // d'échec plutôt que de distinguer "expiré"/"faux"/"déjà utilisé" — évite de révéler à un
  // attaquant lequel de ses essais a le plus de chances d'aboutir.
  async verify(userId: string, purpose: VerificationCodePurpose, submittedCode: string): Promise<void> {
    const record = await this.prisma.client.verificationCode.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const valid = await bcrypt.compare(submittedCode, record.codeHash);
    if (!valid) {
      await this.prisma.client.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Code invalide ou expiré');
    }

    await this.prisma.client.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }
}
