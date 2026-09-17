'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Match, League } from '@football-app/shared-types';
import * as api from '../../../lib/api';

const CALENDAR_DAYS_AHEAD = 5;

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

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scoreLabel(match: Match) {
  if (match.status === 'scheduled') return formatKickoff(match.kickoffAt);
  if (match.status === 'postponed') return 'Reporté';
  if (match.status === 'cancelled') return 'Annulé';
  if (match.status === 'abandoned') return 'Abandonné';
  return `${match.homeScore ?? '-'} - ${match.awayScore ?? '-'}${match.status === 'live' ? ' (live)' : ''}`;
}

export default function LeagueDetailPage({ params }: PageProps<'/leagues/[id]'>) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const days = useMemo(() => nextDays(CALENDAR_DAYS_AHEAD), []);
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') ?? days[0]);
  const [league, setLeague] = useState<League | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);

  useEffect(() => {
    api.getLeague(id).then(setLeague);
  }, [id]);

  useEffect(() => {
    setMatches(null);
    api.getMatches(selectedDate, id).then(setMatches);
  }, [id, selectedDate]);

  return (
    <div style={{ maxWidth: 600, margin: '1.5rem auto' }}>
      <p>
        <Link href="/">← Accueil</Link>
      </p>
      <h1>{league?.name ?? 'Chargement...'}</h1>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {days.map((d) => (
          <button key={d} onClick={() => setSelectedDate(d)} style={{ fontWeight: d === selectedDate ? 700 : 400 }}>
            {new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </button>
        ))}
      </div>

      {matches === null && <p>Chargement...</p>}
      {matches?.length === 0 && <p>Aucun match ce jour-là.</p>}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {matches?.map((match) => (
          <li key={match.id}>
            <Link
              href={`/matches/${match.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem',
                border: '1px solid #333',
                borderRadius: 8,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <span>
                {match.homeTeam.name} — {match.awayTeam.name}
              </span>
              <span>{scoreLabel(match)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
