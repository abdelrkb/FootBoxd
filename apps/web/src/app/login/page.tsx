'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Field } from '../../components/ui/field';
import { Button, OAuthButton } from '../../components/ui/button';

// Retour sur la page d'origine après connexion (modale "connexion requise"). Seuls les chemins
// internes sont acceptés : "//evil.com" ou une URL absolue enverraient vers un autre site.
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}

export default function LoginPage() {
  const t = useTranslations('LoginPage');
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
      router.push(safeNextPath(new URLSearchParams(window.location.search).get('next')));
    } catch {
      // Message générique volontaire (handoff design) : ne pas indiquer si c'est l'email ou
      // le mot de passe qui est faux, pour ne pas confirmer l'existence d'un compte.
      setError(t('invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
        {t('title')}
      </h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label={t('email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field
          label={t('password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          required
        />
        <Link href="/forgot-password" style={{ color: 'var(--fb-nav)', fontSize: 13, alignSelf: 'flex-end' }}>
          {t('forgotPassword')}
        </Link>
        <Button type="submit" loading={submitting} style={{ width: '100%' }}>
          {t('submit')}
        </Button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1, height: 1, background: 'var(--fb-border)' }} />
        <span className="fb-meta">{t('or')}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--fb-border)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <OAuthButton href={api.googleLoginUrl()} label={t('continueWithGoogle')} />
        {/* <OAuthButton href={api.appleLoginUrl()} label="Continuer avec Apple" /> */}
      </div>

      <p style={{ fontSize: 14, color: 'var(--fb-text-2)' }}>
        {t('noAccount')}{' '}
        <Link href="/register" style={{ color: 'var(--fb-nav)' }}>
          {t('signUp')}
        </Link>
      </p>
    </div>
  );
}
