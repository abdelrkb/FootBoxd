'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../lib/auth-context';
import * as api from '../lib/api';
import { Crest } from './ui/crest';
import { NotificationBadge } from './ui/badges';
import { Button } from './ui/button';

// Écart assumé du handoff design (2026-09-20) : nav à 2 liens (Accueil, Recherche) au lieu de
// 4 — le profil se rejoint par l'avatar, les notifications par la cloche. Motif du design :
// "Profil" en lien texte alors que le nom est déjà cliquable à droite était redondant.
function useLinks() {
  const t = useTranslations('Nav');
  return [
    { href: '/', label: t('home') },
    { href: '/search', label: t('search') },
  ];
}

function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--fb-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 9a6 6 0 1 0-12 0c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9Z" />
      <path d="M10.2 18a2 2 0 0 0 3.6 0" />
    </svg>
  );
}

function TabIcon({ d }: { d: string }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const TAB_ICONS = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  watchlist: 'm12 3.5 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8L12 3.5Z',
  bell: 'M18 9a6 6 0 1 0-12 0c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9ZM10.2 18a2 2 0 0 0 3.6 0',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  login: 'M10 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8M14 12H3m0 0 3.5-3.5M3 12l3.5 3.5',
} as const;

// Navigation mobile (issue #65) : barre d'onglets fixe en bas, atteignable au pouce, à la
// place des liens de la barre du haut qui passaient sur deux lignes sur un écran de 390px.
// Masquée au-delà de 720px par `.fb-tabbar` (voir globals.css).
function MobileTabBar({ unreadCount }: { unreadCount: number }) {
  const t = useTranslations('Nav');
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return null;

  const tabs = user
    ? [
        { href: '/', label: t('home'), icon: TAB_ICONS.home },
        { href: '/search', label: t('search'), icon: TAB_ICONS.search },
        { href: '/watchlist', label: t('watchlist'), icon: TAB_ICONS.watchlist },
        { href: '/notifications', label: t('notifications'), icon: TAB_ICONS.bell, badge: unreadCount },
        { href: '/profile', label: t('profile'), icon: TAB_ICONS.profile },
      ]
    : [
        { href: '/', label: t('home'), icon: TAB_ICONS.home },
        { href: '/search', label: t('search'), icon: TAB_ICONS.search },
        { href: '/login', label: t('login'), icon: TAB_ICONS.login },
      ];

  return (
    <nav className="fb-tabbar">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="fb-label"
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '9px 2px 10px',
              fontSize: 9.5,
              letterSpacing: '0.06em',
              color: active ? 'var(--fb-action)' : 'var(--fb-text-2)',
            }}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <TabIcon d={tab.icon} />
              {'badge' in tab && (tab.badge ?? 0) > 0 && <NotificationBadge count={tab.badge!} />}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Rappel de vérification d'email (2026-10-02) : le compte reste utilisable sans vérifier
// (décision produit), un simple bandeau suffit — jamais affiché sur /verify-email elle-même.
function VerifyEmailBanner() {
  const t = useTranslations('Nav');
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 10,
        alignItems: 'center',
        padding: '10px 24px',
        background: 'var(--fb-surface-unread)',
        borderBottom: '1px solid var(--fb-border)',
        fontSize: 13,
        flexWrap: 'wrap',
      }}
    >
      <span>{t('verifyEmailBanner')}</span>
      <Link href="/verify-email" style={{ color: 'var(--fb-nav)', fontWeight: 700 }}>
        {t('verifyEmailCta')}
      </Link>
    </div>
  );
}

export function Nav() {
  const t = useTranslations('Nav');
  const links = useLinks();
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.getNotifications().then((notifs) => setUnreadCount(notifs.filter((n) => !n.isRead).length));
  }, [user]);

  return (
    <>
    {user && !user.emailVerifiedAt && pathname !== '/verify-email' && <VerifyEmailBanner />}
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
        <div className="fb-nav-links">
          {links.map((link) => {
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
      </div>

      <div className="fb-nav-actions">
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
              {t('logout')}
            </button>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="secondary" size="sm">
                {t('login')}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{t('register')}</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
    <MobileTabBar unreadCount={unreadCount} />
    </>
  );
}
