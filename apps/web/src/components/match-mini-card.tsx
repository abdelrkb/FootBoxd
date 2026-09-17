import Link from 'next/link';
import type { PopularMatch } from '@football-app/shared-types';

export function MatchMiniCard({ match }: { match: PopularMatch }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem',
        border: '1px solid #333',
        borderRadius: 8,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span>
        {match.homeTeam.name} {match.homeScore ?? '-'} - {match.awayScore ?? '-'} {match.awayTeam.name}
      </span>
      <span style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
        {match.reviewCount} review{match.reviewCount > 1 ? 's' : ''}
      </span>
    </Link>
  );
}
