'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import * as api from '../lib/api';
import { Crest } from './ui/crest';
import { NotificationBadge } from './ui/badges';
import { Button } from './ui/button';

// Écart assumé du handoff design (2026-09-20) : nav à 2 liens (Accueil, Recherche) au lieu de
// 4 — le profil se rejoint par l'avatar, les notifications par la cloche. Motif du design :
// "Profil" en lien texte alors que le nom est déjà cliquable à droite était redondant.
const LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/search', label: 'Recherche' },
];

function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--fb-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 9a6 6 0 1 0-12 0c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9Z" />
      <path d="M10.2 18a2 2 0 0 0 3.6 0" />
    </svg>
  );
}

export function Nav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.getNotifications().then((notifs) => setUnreadCount(notifs.filter((n) => !n.isRead).length));
  }, [user]);

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 24px',
        borderBottom: '1px solid var(--fb-border)',
        flexWrap: 'wrap',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            border: '1px dashed var(--fb-border-strong)',
            background: 'var(--fb-hatch-avatar)',
            marginRight: 14,
            flexShrink: 0,
          }}
        />
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="fb-label"
              style={{
                padding: '9px 14px 7px',
                borderBottom: active ? '2px solid var(--fb-action)' : '2px solid transparent',
                fontSize: 13,
                fontWeight: active ? 700 : 600,
                color: active ? 'var(--fb-text)' : 'var(--fb-text-2)',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {loading ? null : user ? (
          <>
            <Link
              href="/notifications"
              style={{
                position: 'relative',
                width: 40,
                height: 40,
                borderRadius: 999,
                border: '1px solid var(--fb-border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BellIcon />
              {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
            </Link>
            <Link
              href="/profile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '5px 14px 5px 5px',
                borderRadius: 999,
                border: '1px solid var(--fb-border)',
              }}
            >
              <Crest src={user.avatarUrl} alt={user.displayName} size={28} />
              <span style={{ fontWeight: 600, fontSize: 14.5 }}>{user.displayName}</span>
            </Link>
            <button
              className="fb-label"
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid var(--fb-border)',
                background: 'transparent',
                fontSize: 12,
                color: 'var(--fb-text-2)',
              }}
              onClick={async () => {
                await logout();
                router.push('/login');
              }}
            >
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Connexion
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Inscription</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
