'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { WatchlistEntry } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { useWatchlist } from '../../lib/watchlist-context';
import { ClientDate } from '../../components/client-date';
import { CrestPair } from '../../components/ui/crest';
import { KickoffCountdown } from '../../components/ui/kickoff-countdown';
import { Switch } from '../../components/ui/switch';
import { EmptySocial, EmptyContent } from '../../components/ui/empty-state';
import { SkeletonList } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { toggle } = useWatchlist();
  const [entries, setEntries] = useState<WatchlistEntry[] | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  const load = () => api.getWatchlist().then(setEntries);

  useEffect(() => {
    if (user) {
      load();
      setIsPublic(user.isWatchlistPublic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function togglePrivacy() {
    const next = !isPublic;
    setIsPublic(next);
    await api.setWatchlistVisibility(next);
  }

  async function handleRemove(matchId: string) {
    await toggle(matchId);
    setEntries((prev) => prev?.filter((e) => e.matchId !== matchId) ?? null);
  }

  if (authLoading) return null;
  if (!user) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>
        <EmptySocial
          title="Connecte-toi pour voir ta watchlist"
          subtitle="Ajoute des matchs à regarder plus tard depuis leur fiche."
          action={
            <Link href="/login">
              <Button size="sm">Connexion</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <h1 className="fb-display" style={{ fontSize: 32, margin: 0 }}>
          Watchlist
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15 }}>Rendre privée</span>
          <Switch checked={!isPublic} onChange={togglePrivacy} />
        </div>
      </div>

      {entries === null && <SkeletonList />}
      {entries?.length === 0 && (
        <EmptyContent title="Ta watchlist est vide" subtitle="Ajoute un match depuis sa fiche ou une carte, via le bouton ⋮." />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries?.map(({ match }) => (
          <div
            key={match.id}
            className="fb-card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 14,
              border: '1px solid var(--fb-border)',
              borderRadius: 12,
              gap: 12,
            }}
          >
            <Link
              href={`/matches/${match.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, textDecoration: 'none', color: 'inherit', flex: 1 }}
            >
              <CrestPair home={match.homeTeam} away={match.awayTeam} size={34} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span className="fb-card-title" style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {match.homeTeam.name} — {match.awayTeam.name}
                </span>
                <span className="fb-meta" style={{ fontSize: 12 }}>
                  <ClientDate iso={match.kickoffAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} fallback="" />
                </span>
              </div>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              <KickoffCountdown kickoffAt={match.kickoffAt} />
              <button
                onClick={() => handleRemove(match.id)}
                aria-label="Retirer de la watchlist"
                className="fb-label"
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 999,
                  fontSize: 11,
                  border: '1px solid var(--fb-border)',
                  background: 'transparent',
                  color: 'var(--fb-text-2)',
                }}
              >
                Retirer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
