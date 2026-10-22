'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Field } from '../../components/ui/field';
import { Button } from '../../components/ui/button';

export default function RegisterPage() {
  const t = useTranslations('RegisterPage');
  const tCommon = useTranslations('Common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.register(email, password, displayName, username);
      await refresh();
      // Parcours après inscription (handoff design, "à valider" → validé le 2026-09-20) :
      // choix des ligues + réglages, une seule fois pour un nouveau compte.
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : tCommon('unknownError'));
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
        <Field
          label={t('username')}
          hint={t('usernameHint')}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          pattern="[a-z0-9_]{3,20}"
          required
        />
        <Field
          label={t('displayName')}
          hint={t('displayNameHint')}
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <Field label={t('email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field
          label={t('password')}
          hint={t('passwordHint')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          required
        />
        <Button type="submit" loading={submitting} style={{ width: '100%' }}>
          {t('submit')}
        </Button>
      </form>
      <p style={{ fontSize: 14, color: 'var(--fb-text-2)' }}>
        {t('alreadyHaveAccount')}{' '}
        <Link href="/login" style={{ color: 'var(--fb-nav)' }}>
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
