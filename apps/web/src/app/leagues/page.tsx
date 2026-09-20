'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { League } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Crest } from '../../components/ui/crest';
import { LiveCountBadge } from '../../components/ui/badges';
import { EmptySocial } from '../../components/ui/empty-state';
import { SkeletonList } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { leagueAccentColor } from '../../components/ui/card-shell';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AllLeaguesPage() {
  const { user, loading: authLoading } = useAuth();
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [liveCounts, setLiveCounts] = useState<Map<string, number>>(new Map());
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getAllLeagues().then(setLeagues);
    api.getMatches(today()).then((matches) => {
      const counts = new Map<string, number>();
      for (const m of matches) {
        if (m.status !== 'live') continue;
        counts.set(m.league.id, (counts.get(m.league.id) ?? 0) + 1);
      }
      setLiveCounts(counts);
    });
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

  const filtered = useMemo(() => {
    if (!leagues) return { favorites: [], rest: [] };
    const q = filter.trim().toLowerCase();
    const matching = q
      ? leagues.filter((l) => l.name.toLowerCase().includes(q) || (l.country ?? '').toLowerCase().includes(q))
      : leagues;
    const favorites = matching.filter((l) => favoriteIds.has(l.id)).sort((a, b) => a.name.localeCompare(b.name));
    const rest = matching.filter((l) => !favoriteIds.has(l.id)).sort((a, b) => a.name.localeCompare(b.name));
    return { favorites, rest };
  }, [leagues, filter, favoriteIds]);

  function LeagueRow({ league }: { league: League }) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          border: '1px solid var(--fb-border)',
          borderRadius: 12,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ width: 3, height: 18, borderRadius: 999, background: leagueAccentColor(league), flexShrink: 0 }} />
          <Crest src={league.logoUrl} alt={league.name} size={30} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {league.name}
            </span>
            {league.country && (
              <span className="fb-num" style={{ fontSize: 11, color: 'var(--fb-text-3)' }}>
                {league.country}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {(liveCounts.get(league.id) ?? 0) > 0 && <LiveCountBadge count={liveCounts.get(league.id)!} />}
          {user && (
            <button
              onClick={() => toggleFavorite(league.id)}
              className="fb-label"
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 999,
                fontSize: 11.5,
                whiteSpace: 'nowrap',
                border: `1px solid ${favoriteIds.has(league.id) ? 'var(--fb-rating)' : 'var(--fb-border)'}`,
                background: favoriteIds.has(league.id) ? 'var(--fb-rating-bg)' : 'transparent',
                color: favoriteIds.has(league.id) ? 'var(--fb-rating)' : 'var(--fb-text-2)',
              }}
            >
              {favoriteIds.has(league.id) ? '★ Favori' : '☆ Ajouter'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
        Toutes les ligues
      </h1>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer par nom ou pays…"
        className="fb-label"
        style={{
          height: 46,
          padding: '0 16px',
          borderRadius: 999,
          border: '1px solid var(--fb-border)',
          background: 'var(--fb-bg)',
          color: 'var(--fb-text)',
          fontSize: 13,
          textTransform: 'none',
          letterSpacing: 'normal',
        }}
      />

      {!authLoading && !user && (
        <EmptySocial
          title="Connecte-toi pour ajouter des favoris"
          subtitle="Retrouve tes ligues préférées en un coup d'œil sur l'accueil."
          action={
            <Link href="/login">
              <Button size="sm">Connexion</Button>
            </Link>
          }
        />
      )}

      {leagues === null && <SkeletonList count={6} />}

      {leagues && user && filtered.favorites.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="fb-section" style={{ margin: 0, fontSize: 13 }}>
            Tes favoris
          </h2>
          {filtered.favorites.map((l) => (
            <LeagueRow key={l.id} league={l} />
          ))}
        </div>
      )}

      {leagues && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {user && (
            <h2 className="fb-section" style={{ margin: 0, fontSize: 13 }}>
              Tout le reste
            </h2>
          )}
          {filtered.rest.map((l) => (
            <LeagueRow key={l.id} league={l} />
          ))}
        </div>
      )}
    </div>
  );
}
