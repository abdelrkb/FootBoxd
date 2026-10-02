import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { EmailService } from '../src/email/email.service.js';

type EmailKind = 'verification' | 'reset';

// Remplace le vrai EmailService (Brevo) dans les tests : capture les codes envoyés au lieu de
// faire un appel réseau, pour que les specs puissent les lire et les soumettre aux endpoints de
// vérification/reset — le code en clair n'est JAMAIS persisté en base (voir
// verification-code.service.ts), donc un test ne peut l'obtenir que de cette façon.
export class FakeEmailService {
  sent: { to: string; code: string; kind: EmailKind }[] = [];

  async sendVerificationCode(to: string, code: string): Promise<void> {
    this.sent.push({ to, code, kind: 'verification' });
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    this.sent.push({ to, code, kind: 'reset' });
  }

  latestCodeFor(to: string, kind: EmailKind): string {
    const match = [...this.sent].reverse().find((e) => e.to === to && e.kind === kind);
    if (!match) throw new Error(`Aucun email "${kind}" envoyé à ${to} pendant ce test`);
    return match.code;
  }
}

export async function createTestApp(): Promise<{ app: INestApplication; fakeEmail: FakeEmailService }> {
  const fakeEmail = new FakeEmailService();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailService)
    .useValue(fakeEmail)
    .compile();

  const app = moduleRef.createNestApplication();
  // Réplique le bootstrap réel (apps/api/src/main.ts) : sans ça, ni les cookies d'auth ni la
  // validation des DTO ne fonctionneraient dans les tests.
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  return { app, fakeEmail };
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100_000)}@e2e.footboxd.invalid`;
}
