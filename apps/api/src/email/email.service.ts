import { Injectable, Logger } from '@nestjs/common';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

// Envoi d'email transactionnel via Brevo (compte & sécurité, 2026-10-02) — voir
// architecture.md section 8 pour la mise en place du compte/domaine. Appel REST direct plutôt
// qu'un SDK dédié : un seul usage (code à 6 chiffres), même style que le worker TheSportsDB
// (fetch brut, pas de client généré).
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.BREVO_API_KEY;
  private readonly fromEmail = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@footboxd.app';
  private readonly fromName = process.env.EMAIL_FROM_NAME ?? 'FootBoxd';

  private async send(to: string, subject: string, htmlContent: string): Promise<void> {
    if (!this.apiKey) {
      // Permet de faire tourner l'app en dev sans compte Brevo configuré (voir README) : le
      // code atterrit dans les logs au lieu de partir par email.
      this.logger.warn(`BREVO_API_KEY absent — email non envoyé à ${to}. Contenu :\n${htmlContent}`);
      return;
    }
    const res = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: this.fromEmail, name: this.fromName },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Échec d'envoi Brevo (${res.status}) vers ${to} : ${body}`);
      throw new Error("Échec de l'envoi de l'email");
    }
  }

  sendVerificationCode(to: string, code: string): Promise<void> {
    return this.send(
      to,
      'Confirme ton adresse email — FootBoxd',
      `<p>Voici ton code de confirmation FootBoxd :</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>Ce code expire dans 15 minutes. Si tu n'es pas à l'origine de cette inscription, ignore cet email.</p>`,
    );
  }

  sendPasswordResetCode(to: string, code: string): Promise<void> {
    return this.send(
      to,
      'Réinitialise ton mot de passe — FootBoxd',
      `<p>Voici ton code pour réinitialiser ton mot de passe FootBoxd :</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>Ce code expire dans 15 minutes. Si tu n'es pas à l'origine de cette demande, ignore cet email — ton mot de passe reste inchangé.</p>`,
    );
  }
}
