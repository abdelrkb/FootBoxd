import Link from 'next/link';
import type { PopularMatch } from '@football-app/shared-types';
import { CrestPair } from './ui/crest';
import { cardShellStyle, LeagueStripe } from './ui/card-shell';

export function MatchMiniCard({ match }: { match: PopularMatch }) {
  return (
    <Link href={`/matches/${match.id}`} style={{ ...cardShellStyle(), alignItems: 'center' }} className="fb-card">
      <CrestPair home={match.homeTeam} away={match.awayTeam} size={36} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
        <LeagueStripe league={match.league} />
        <span className="fb-card-title">
          {match.homeTeam.name} — {match.awayTeam.name}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        <span className="fb-num" style={{ fontWeight: 600, fontSize: 19 }}>
          {match.reviewCount}
        </span>
        <span className="fb-label" style={{ fontSize: 10.5, color: 'var(--fb-text-3)' }}>
          reviews
        </span>
      </div>
    </Link>
  );
}
