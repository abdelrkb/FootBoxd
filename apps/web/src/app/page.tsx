'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Match } from '@football-app/shared-types';
import * as api from '../lib/api';

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

export default function HomePage() {
  const days = useMemo(() => nextDays(CALENDAR_DAYS_AHEAD), []);
  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  useEffect(() => {
    setMatches(null);
    setSelectedLeagueId(null);
    api.getMatches(selectedDate).then(setMatches);
  }, [selectedDate]);

  const leagues = useMemo(() => {
    if (!matches) return [];
    const seen = new Map<string, string>();
    for (const m of matches) seen.set(m.league.id, m.league.name);
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [matches]);

  const groupedByLeague = useMemo(() => {
    if (!matches) return [];
    const filtered = selectedLeagueId ? matches.filter((m) => m.league.id === selectedLeagueId) : matches;
    const groups = new Map<string, { leagueName: string; matches: Match[] }>();
    for (const m of filtered) {
      const group = groups.get(m.league.id) ?? { leagueName: m.league.name, matches: [] };
      group.matches.push(m);
      groups.set(m.league.id, group);
    }
    return Array.from(groups.values());
  }, [matches, selectedLeagueId]);

  return (
    <div style={{ maxWidth: 720, margin: '1.5rem auto' }}>
      <h1>Accueil</h1>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            style={{ fontWeight: d === selectedDate ? 700 : 400 }}
          >
            {new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </button>
        ))}
      </div>

      {leagues.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <button onClick={() => setSelectedLeagueId(null)} style={{ fontWeight: selectedLeagueId === null ? 700 : 400 }}>
            Toutes les ligues
          </button>
          {leagues.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedLeagueId(l.id)}
              style={{ fontWeight: selectedLeagueId === l.id ? 700 : 400 }}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      {matches === null && <p>Chargement...</p>}
      {matches?.length === 0 && <p>Aucun match ce jour-là.</p>}

      {groupedByLeague.map((group) => (
        <section key={group.leagueName} style={{ marginBottom: '1.5rem' }}>
          <h3>{group.leagueName}</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {group.matches.map((match) => (
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
        </section>
      ))}
    </div>
  );
}
