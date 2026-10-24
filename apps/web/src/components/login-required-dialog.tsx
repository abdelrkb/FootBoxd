'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from './ui/button';

// Affichée quand un visiteur non connecté tente une action réservée (liker, commenter). Le lien
// de connexion passe la page courante en `next` pour y revenir une fois connecté.
export function LoginRequiredDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('LoginRequiredDialog');
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--fb-surface-2)',
          border: '1px solid var(--fb-border)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h2 className="fb-card-title" style={{ margin: 0, fontSize: 18 }}>
          {t('title')}
        </h2>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--fb-text-2)' }}>{t('message')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href={loginHref} style={{ display: 'block' }}>
            <Button style={{ width: '100%' }}>{t('login')}</Button>
          </Link>
          <Link href="/register" style={{ display: 'block' }}>
            <Button variant="secondary" style={{ width: '100%' }}>
              {t('register')}
            </Button>
          </Link>
          <Button variant="tertiary" onClick={onClose} style={{ width: '100%' }}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
