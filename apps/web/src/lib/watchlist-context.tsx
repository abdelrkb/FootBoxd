'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from './api';
import { useAuth } from './auth-context';

interface WatchlistContextValue {
  matchIds: Set<string>;
  isInWatchlist: (matchId: string) => boolean;
  toggle: (matchId: string) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

// État partagé de la watchlist (quels matchs y figurent) — un seul fetch pour toute l'app, pour
// que le bouton d'une carte reflète immédiatement un ajout/retrait fait depuis une autre carte
// ou la page de détail du match (même logique que AuthProvider).
export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [matchIds, setMatchIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setMatchIds(new Set());
      return;
    }
    api.getWatchlistIds().then((ids) => setMatchIds(new Set(ids)));
  }, [user]);

  async function toggle(matchId: string) {
    const inWatchlist = matchIds.has(matchId);
    setMatchIds((prev) => {
      const next = new Set(prev);
      if (inWatchlist) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
    try {
      if (inWatchlist) await api.removeFromWatchlist(matchId);
      else await api.addToWatchlist(matchId);
    } catch (err) {
      // Repli si l'appel échoue — évite un état front désynchronisé de la base.
      setMatchIds((prev) => {
        const next = new Set(prev);
        if (inWatchlist) next.add(matchId);
        else next.delete(matchId);
        return next;
      });
      throw err;
    }
  }

  return (
    <WatchlistContext.Provider value={{ matchIds, isInWatchlist: (id) => matchIds.has(id), toggle }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist doit être utilisé sous WatchlistProvider');
  return ctx;
}
