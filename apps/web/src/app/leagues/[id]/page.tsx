'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Match, League } from '@football-app/shared-types';
import * as api from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { ClientDate } from '../../../components/client-date';
import { DateSelector } from '../../../components/ui/date-selector';
import { Crest, CrestPair } from '../../../components/ui/crest';
import { ScoreChip } from '../../../components/ui/badges';
import { StatusLabel } from '../../../components/ui/status-label';
import { EmptyContent } from '../../../components/ui/empty-state';
import { SkeletonList } from '../../../components/ui/skeleton';
import { SpoilerScore } from '../../../components/ui/spoiler-score';
import { todayString } from '../../../lib/calendar-days';

function MatchRight({ match }: { match: Match }) {
  if (match.status === 'scheduled') {
    return (
      <span className="fb-num" style={{ color: 'var(--fb-text-2)' }}>
        <ClientDate iso={match.kickoffAt} options={{ hour: '2-digit', minute: '2-digit' }} fallback="" />
      </span>
    );
  }
  if (match.status === 'live' || match.status === 'finished') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <SpoilerScore>
          <ScoreChip home={match.homeScore} away={match.awayScore} live={match.status === 'live'} />
        </SpoilerScore>
        {match.status === 'live' && <StatusLabel status={match.status} minute={match.liveMinute} />}
      </div>
    );
  }
  return <StatusLabel status={match.status} />;
}

export default function LeagueDetailPage({ params }: PageProps<'/leagues/[id]'>) {
  const { id } = use(params);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') ?? todayString());
  const [league, setLeague] = useState<League | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    api.getLeague(id).then(setLeague);
  }, [id]);

  useEffect(() => {
    setMatches(null);
    api.getMatches(selectedDate, id).then(setMatches);
  }, [id, selectedDate]);

  useEffect(() => {
    if (!user) return;
    api.getFavoriteLeagues(user.id).then((favs) => setIsFavorite(favs.some((l) => l.id === id)));
  }, [user, id]);

  async function toggleFavorite() {
    if (!user) return;
    if (isFavorite) await api.unfavoriteLeague(id);
    else await api.favoriteLeague(id);
    setIsFavorite((prev) => !prev);
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Link href="/" className="fb-label" style={{ fontSize: 12, color: 'var(--fb-text-2)' }}>
        ← Accueil
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Crest src={league?.logoUrl} alt={league?.name ?? ''} size={56} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {league?.country && (
              <span className="fb-label" style={{ fontSize: 11, color: 'var(--fb-text-2)' }}>
                {league.country}
              </span>
            )}
            <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
              {league?.name ?? '…'}
            </h1>
          </div>
        </div>
        {user && (
          <button
            onClick={toggleFavorite}
            className="fb-label"
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 999,
              fontSize: 12,
              whiteSpace: 'nowrap',
              border: `1px solid ${isFavorite ? 'var(--fb-rating)' : 'var(--fb-border)'}`,
              background: isFavorite ? 'var(--fb-rating-bg)' : 'transparent',
              color: isFavorite ? 'var(--fb-rating)' : 'var(--fb-text-2)',
            }}
          >
            {isFavorite ? '★ Favori' : '☆ Ajouter'}
          </button>
        )}
      </div>

      <DateSelector selected={selectedDate} onSelect={setSelectedDate} />

      {matches === null && <SkeletonList />}
      {matches?.length === 0 && <EmptyContent title="Aucun match ce jour-là" subtitle="Essaie un autre jour du sélecteur." />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {matches?.map((match) => (
          <Link
            key={match.id}
            href={`/matches/${match.id}`}
            className="fb-card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 14,
              border: '1px solid var(--fb-border)',
              borderRadius: 12,
              textDecoration: 'none',
              color: 'inherit',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <CrestPair home={match.homeTeam} away={match.awayTeam} size={34} />
              <span className="fb-card-title" style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {match.homeTeam.name} — {match.awayTeam.name}
              </span>
            </div>
            <MatchRight match={match} />
          </Link>
        ))}
      </div>
    </div>
  );
}
