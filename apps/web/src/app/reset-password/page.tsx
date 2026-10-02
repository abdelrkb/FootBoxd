'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Field } from '../../components/ui/field';
import { Button } from '../../components/ui/button';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.resetPassword(email, code, newPassword);
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
        Nouveau mot de passe
      </h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field
          label="Code reçu par email"
          hint="6 chiffres, valable 15 minutes"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
        />
        <Field
          label="Nouveau mot de passe"
          hint="8 caractères minimum"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={error ?? undefined}
          required
        />
        <Button type="submit" loading={submitting} style={{ width: '100%' }}>
          Réinitialiser
        </Button>
      </form>
      <p style={{ fontSize: 14, color: 'var(--fb-text-2)' }}>
        <Link href="/forgot-password" style={{ color: 'var(--fb-nav)' }}>
          Redemander un code
        </Link>
      </p>
    </div>
  );
}
