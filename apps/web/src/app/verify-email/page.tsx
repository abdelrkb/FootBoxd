'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Field } from '../../components/ui/field';
import { Button } from '../../components/ui/button';

export default function VerifyEmailPage() {
  const t = useTranslations('VerifyEmailPage');
  const tCommon = useTranslations('Common');
  const { user, loading: authLoading, refresh } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.verifyEmail(code);
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : tCommon('unknownError'));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await api.resendVerificationCode();
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : tCommon('unknownError'));
    }
  }

  if (authLoading) return null;
  if (!user) {
    return (
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/login">{t('loginLink')}</Link> {t('toVerifyEmail')}
      </p>
    );
  }
  if (user.emailVerifiedAt) {
    return (
      <div style={{ maxWidth: 420, margin: '64px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 15 }}>{t('alreadyVerified')}</p>
        <Link href="/" style={{ color: 'var(--fb-nav)' }}>
          {t('backHome')}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
        {t('title')}
      </h1>
      <p style={{ color: 'var(--fb-text-2)', fontSize: 15 }}>
        {t.rich('codeSentTo', { email: user.email, strong: (chunks) => <strong>{chunks}</strong> })}
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field
          label={t('code')}
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          error={error ?? undefined}
          required
        />
        <Button type="submit" loading={submitting} style={{ width: '100%' }}>
          {t('confirm')}
        </Button>
      </form>
      <button
        onClick={resend}
        className="fb-label"
        style={{ background: 'none', border: 'none', color: 'var(--fb-nav)', fontSize: 13, alignSelf: 'flex-start' }}
      >
        {resent ? t('codeResent') : t('resendCode')}
      </button>
    </div>
  );
}
