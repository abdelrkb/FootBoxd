'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Field } from '../../components/ui/field';
import { Button, OAuthButton } from '../../components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.login(email, password);
      await refresh();
      router.push('/');
    } catch {
      // Message générique volontaire (handoff design) : ne pas indiquer si c'est l'email ou
      // le mot de passe qui est faux, pour ne pas confirmer l'existence d'un compte.
      setError('Email ou mot de passe incorrect.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
        Connexion
      </h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          required
        />
        <Button type="submit" loading={submitting} style={{ width: '100%' }}>
          Se connecter
        </Button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1, height: 1, background: 'var(--fb-border)' }} />
        <span className="fb-meta">ou</span>
        <span style={{ flex: 1, height: 1, background: 'var(--fb-border)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <OAuthButton href={api.googleLoginUrl()} label="Continuer avec Google" />
        <OAuthButton href={api.appleLoginUrl()} label="Continuer avec Apple" />
      </div>

      <p style={{ fontSize: 14, color: 'var(--fb-text-2)' }}>
        Pas de compte ?{' '}
        <Link href="/register" style={{ color: 'var(--fb-nav)' }}>
          S'inscrire
        </Link>
      </p>
    </div>
  );
}
