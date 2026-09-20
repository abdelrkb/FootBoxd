import type { CSSProperties } from 'react';
import type { League } from '@football-app/shared-types';

// Coque commune aux 4 usages de "la carte unique" (handoff design : reviews populaires, amis,
// matchs populaires, profil).
export const cardShellStyle = (padding = 18): CSSProperties => ({
  border: '1px solid var(--fb-border)',
  borderRadius: 16,
  background: 'var(--fb-surface)',
  padding,
  display: 'flex',
  gap: 14,
  textDecoration: 'none',
  color: 'inherit',
});

const LEAGUE_COLORS: Record<string, string> = {
  'French Ligue 1': 'var(--fb-league-ligue1)',
  'English Premier League': 'var(--fb-league-premier)',
  'Spanish La Liga': 'var(--fb-league-liga)',
  'German Bundesliga': 'var(--fb-league-bundesliga)',
  'Italian Serie A': 'var(--fb-league-seriea)',
  'UEFA Champions League': 'var(--fb-league-ucl)',
  'UEFA Europa League': 'var(--fb-league-uel)',
};

export function leagueAccentColor(league: Pick<League, 'name'>): string {
  return LEAGUE_COLORS[league.name] ?? 'var(--fb-league-default)';
}

// Filet de compétition 3px + nom de la ligue (slot 1 de la carte unique).
export function LeagueStripe({ league }: { league: Pick<League, 'name'> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 3, height: 12, borderRadius: 999, background: leagueAccentColor(league) }} />
      <span className="fb-label" style={{ color: 'var(--fb-text-2)', fontSize: 11 }}>
        {league.name}
      </span>
    </div>
  );
}
