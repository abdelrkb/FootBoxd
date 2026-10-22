'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicUser } from '@football-app/shared-types';
import * as api from './api';
import { getLocaleCookie, isLocale, setLocaleCookie } from '../i18n/config';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = async () => {
    try {
      const fresh = await api.getMe();
      setUser(fresh);
      // i18n (issue #27) : la préférence explicite du compte prime sur la détection auto — si
      // elle diffère du cookie déjà posé (ex. connecté depuis un autre appareil/navigateur), on
      // aligne et on rafraîchit pour que le rendu serveur reparte avec les bons messages.
      if (fresh.locale && isLocale(fresh.locale) && getLocaleCookie() !== fresh.locale) {
        setLocaleCookie(fresh.locale);
        router.refresh();
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return ctx;
}
