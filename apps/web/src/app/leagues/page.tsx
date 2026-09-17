'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { League } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

export default function AllLeaguesPage() {
  const { user, loading: authLoading } = useAuth();
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getAllLeagues().then(setLeagues);
  }, []);

  useEffect(() => {
    if (!user) return;
    api.getFavoriteLeagues(user.id).then((favs) => setFavoriteIds(new Set(favs.map((l) => l.id))));
  }, [user]);

  async function toggleFavorite(leagueId: string) {
    if (!user) return;
    if (favoriteIds.has(leagueId)) {
      await api.unfavoriteLeague(leagueId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(leagueId);
        return next;
      });
    } else {
      await api.favoriteLeague(leagueId);
      setFavoriteIds((prev) => new Set(prev).add(leagueId));
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '1.5rem auto' }}>
      <h1>Toutes les ligues</h1>
      {!authLoading && !user && (
        <p>
          <Link href="/login">Connecte-toi</Link> pour ajouter des favoris.
        </p>
      )}
      {leagues === null && <p>Chargement...</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {leagues?.map((league) => (
          <li
            key={league.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              border: '1px solid #333',
              borderRadius: 8,
            }}
          >
            <span>{league.name}</span>
            {user && (
              <button onClick={() => toggleFavorite(league.id)}>
                {favoriteIds.has(league.id) ? '★ Favori' : '☆ Ajouter'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
