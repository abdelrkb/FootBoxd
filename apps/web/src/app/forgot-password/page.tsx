'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as api from '../../lib/api';
import { Field } from '../../components/ui/field';
import { Button } from '../../components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 420, margin: '64px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
          Vérifie ta boîte mail
        </h1>
        <p style={{ color: 'var(--fb-text-2)', fontSize: 15, lineHeight: 1.6 }}>
          Si un compte existe pour <strong>{email}</strong>, un code à 6 chiffres vient d'être envoyé. Il expire dans 15
          minutes.
        </p>
        <Button onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)} style={{ width: '100%' }}>
          J'ai mon code
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
        Mot de passe oublié
      </h1>
      <p style={{ color: 'var(--fb-text-2)', fontSize: 15 }}>On t'envoie un code à 6 chiffres par email pour en choisir un nouveau.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button type="submit" loading={submitting} style={{ width: '100%' }}>
          Envoyer le code
        </Button>
      </form>
      <p style={{ fontSize: 14, color: 'var(--fb-text-2)' }}>
        <Link href="/login" style={{ color: 'var(--fb-nav)' }}>
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
