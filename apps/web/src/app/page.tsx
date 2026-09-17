'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Match, League, PopularReview, PopularMatch, ReviewWithMatch } from '@football-app/shared-types';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { ClientDate } from '../components/client-date';
import { ReviewMiniCard } from '../components/review-mini-card';
import { MatchMiniCard } from '../components/match-mini-card';

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
  isFavorite: boolean;
}

function Sidebar({ user }: { user: { id: string } | null }) {
  const [popularReviews, setPopularReviews] = useState<PopularReview[] | null>(null);
  const [followingReviews, setFollowingReviews] = useState<ReviewWithMatch[] | null>(null);
  const [popularMatches, setPopularMatches] = useState<PopularMatch[] | null>(null);

  useEffect(() => {
    api.getPopularReviews().then(setPopularReviews);
    api.getPopularMatches().then(setPopularMatches);
  }, []);

  useEffect(() => {
    if (user) api.getFollowingReviews().then(setFollowingReviews);
  }, [user]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section>
        <h2 style={{ fontSize: '1.1rem' }}>Reviews populaires</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {popularReviews === null && <p>Chargement...</p>}
          {popularReviews?.length === 0 && <p>Rien de populaire pour l'instant.</p>}
          {popularReviews?.map((r) => <ReviewMiniCard key={r.id} review={r} />)}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem' }}>Reviews de mes amis</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {!user && (
            <p>
              <Link href="/login">Connecte-toi</Link> et suis des utilisateurs pour voir leurs reviews ici.
            </p>
          )}
          {user && followingReviews === null && <p>Chargement...</p>}
          {user && followingReviews?.length === 0 && (
            <p>
              Aucune review pour l'instant. <Link href="/search">Suis des utilisateurs</Link> pour en voir ici.
            </p>
          )}
          {followingReviews?.map((r) => <ReviewMiniCard key={r.id} review={r} />)}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem' }}>Matchs populaires</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {popularMatches === null && <p>Chargement...</p>}
          {popularMatches?.length === 0 && <p>Rien de populaire pour l'instant.</p>}
          {popularMatches?.map((m) => <MatchMiniCard key={m.id} match={m} />)}
        </div>
      </section>
    </div>
  );
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

  // Toutes les ligues ayant un match à la date sélectionnée, favoris en priorité (triés en
  // premier), puis le reste par ordre alphabétique — décision produit du 2026-09-17.
  const leagueRows: LeagueRow[] = useMemo(() => {
    if (!matches || favoriteLeagueIds === null) return [];
    const byLeague = new Map<string, LeagueRow>();
    for (const m of matches) {
      const row = byLeague.get(m.league.id) ?? {
        league: m.league,
        liveCount: 0,
        isFavorite: favoriteLeagueIds.has(m.league.id),
      };
      if (m.status === 'live') row.liveCount += 1;
      byLeague.set(m.league.id, row);
    }
    return Array.from(byLeague.values()).sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return a.league.name.localeCompare(b.league.name);
    });
  }, [matches, favoriteLeagueIds]);

  const loading = matches === null || favoriteLeagueIds === null;

  return (
    <div style={{ maxWidth: 960, margin: '2rem auto', display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 480px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>Mes ligues</h1>
          <Link href="/leagues">Toutes les ligues</Link>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          {days.map((d) => (
            <button key={d} onClick={() => setSelectedDate(d)} style={{ fontWeight: d === selectedDate ? 700 : 400 }}>
              <ClientDate iso={d} options={{ weekday: 'short', day: 'numeric', month: 'short' }} fallback={d} />
            </button>
          ))}
        </div>

        {loading && <p>Chargement...</p>}
        {!loading && leagueRows.length === 0 && <p>Aucun match ce jour-là.</p>}

        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {leagueRows.map(({ league, liveCount, isFavorite }) => (
            <li key={league.id}>
              <Link
                href={`/leagues/${league.id}?date=${selectedDate}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.9rem 1.1rem',
                  border: '1px solid #333',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'inherit',
                  fontWeight: 500,
                }}
              >
                <span>
                  {isFavorite && <span style={{ marginRight: '0.5rem' }}>★</span>}
                  {league.name}
                </span>
                {liveCount > 0 && (
                  <span
                    style={{
                      background: '#e11d1d',
                      color: 'white',
                      borderRadius: 999,
                      minWidth: 24,
                      height: 24,
                      padding: '0 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    {liveCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ flex: '1 1 320px', minWidth: 280 }}>
        <Sidebar user={user} />
      </div>
    </div>
  );
}
