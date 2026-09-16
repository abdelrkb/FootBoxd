'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import styles from './nav.module.css';

export function Nav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: '/', label: 'Accueil' },
    { href: '/search', label: 'Recherche' },
    { href: '/notifications', label: 'Notifications' },
    { href: '/profile', label: 'Profil' },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? styles.active : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className={styles.auth}>
        {loading ? null : user ? (
          <>
            <span>{user.displayName}</span>
            <button
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
            <Link href="/login">Connexion</Link>
            <Link href="/register">Inscription</Link>
          </>
        )}
      </div>
    </nav>
  );
}
