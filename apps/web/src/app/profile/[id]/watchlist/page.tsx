'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { WatchlistEntry } from '@football-app/shared-types';
import * as api from '../../../../lib/api';
import { ClientDate } from '../../../../components/client-date';
import { CrestPair } from '../../../../components/ui/crest';
import { KickoffCountdown } from '../../../../components/ui/kickoff-countdown';
import { EmptyContent } from '../../../../components/ui/empty-state';
import { SkeletonList } from '../../../../components/ui/skeleton';

export default function UserWatchlistPage({ params }: PageProps<'/profile/[id]/watchlist'>) {
  const { id } = use(params);
  const [entries, setEntries] = useState<WatchlistEntry[] | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    api
      .getUserWatchlist(id)
      .then(setEntries)
      .catch((err) => {
        if (err instanceof api.ApiError && err.status === 403) setForbidden(true);
      });
  }, [id]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Link href={`/profile/${id}`} className="fb-label" style={{ fontSize: 12, color: 'var(--fb-text-2)' }}>
        ← Profil
      </Link>

      <h1 className="fb-display" style={{ fontSize: 32, margin: 0 }}>
        Watchlist
      </h1>

      {forbidden && <EmptyContent title="Cette watchlist est privée" />}
      {!forbidden && entries === null && <SkeletonList />}
      {!forbidden && entries?.length === 0 && <EmptyContent title="Aucun match dans cette watchlist" />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries?.map(({ match }) => (
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span className="fb-card-title" style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {match.homeTeam.name} — {match.awayTeam.name}
                </span>
                <span className="fb-meta" style={{ fontSize: 12 }}>
                  <ClientDate iso={match.kickoffAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} fallback="" />
                </span>
              </div>
            </div>
            <KickoffCountdown kickoffAt={match.kickoffAt} />
          </Link>
        ))}
      </div>
    </div>
  );
}
