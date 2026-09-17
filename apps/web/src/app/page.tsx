'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Match, League } from '@football-app/shared-types';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth-context';

const CALENDAR_DAYS_AHEAD = 5; // section 7 : calendrier navigable jusqu'à +5 jours

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function nextDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(toDateString(d));
  }
  return days;
}

interface LeagueRow {
  league: League;
  liveCount: number;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const days = useMemo(() => nextDays(CALENDAR_DAYS_AHEAD), []);
  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [favoriteLeagueIds, setFavoriteLeagueIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    setMatches(null);
    api.getMatches(selectedDate).then(setMatches);
  }, [selectedDate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setFavoriteLeagueIds(new Set());
      return;
    }
    api.getFavoriteLeagues(user.id).then((leagues) => setFavoriteLeagueIds(new Set(leagues.map((l) => l.id))));
  }, [user, authLoading]);

  // Connecté : uniquement les ligues favorites ayant un match ce jour-là.
  // Anonyme (pas de favoris) : toutes les ligues ayant un match ce jour-là, pour rester
  // utile à un visiteur qui parcourt sans compte.
  const leagueRows: LeagueRow[] = useMemo(() => {
    if (!matches || favoriteLeagueIds === null) return [];
    const onlyFavorites = user !== null;
    const byLeague = new Map<string, LeagueRow>();
    for (const m of matches) {
      if (onlyFavorites && !favoriteLeagueIds.has(m.league.id)) continue;
      const row = byLeague.get(m.league.id) ?? { league: m.league, liveCount: 0 };
      if (m.status === 'live') row.liveCount += 1;
      byLeague.set(m.league.id, row);
    }
    return Array.from(byLeague.values()).sort((a, b) => a.league.name.localeCompare(b.league.name));
  }, [matches, favoriteLeagueIds, user]);

  const loading = matches === null || favoriteLeagueIds === null;

  return (
    <div style={{ maxWidth: 600, margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Accueil</h1>
        <Link href="/leagues">Toutes les ligues</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {days.map((d) => (
          <button key={d} onClick={() => setSelectedDate(d)} style={{ fontWeight: d === selectedDate ? 700 : 400 }}>
            {new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </button>
        ))}
      </div>

      {user && favoriteLeagueIds?.size === 0 && (
        <p style={{ marginTop: '1rem' }}>
          Aucune ligue favorite. Va dans <Link href="/leagues">Toutes les ligues</Link> pour en ajouter.
        </p>
      )}

      {loading && <p>Chargement...</p>}
      {!loading && leagueRows.length === 0 && (favoriteLeagueIds?.size ?? 0) > 0 && (
        <p>Aucun de tes favoris ne joue ce jour-là.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {leagueRows.map(({ league, liveCount }) => (
          <li key={league.id}>
            <Link
              href={`/leagues/${league.id}?date=${selectedDate}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                border: '1px solid #333',
                borderRadius: 8,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <span>{league.name}</span>
              {liveCount > 0 && <span>🔴 {liveCount} en direct</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
