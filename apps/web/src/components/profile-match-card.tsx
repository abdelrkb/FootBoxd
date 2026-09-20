import Link from 'next/link';
import type { ReviewWithMatch } from '@football-app/shared-types';
import { CrestPair } from './ui/crest';
import { StarsDisplay } from './ui/stars';
import { cardShellStyle, LeagueStripe } from './ui/card-shell';
import { ClientDate } from './client-date';

// Variante compacte de la carte unique, 4 par grille sur le profil (handoff design) : fiche
// verticale, mini-tableau d'affichage par équipe, pied avec date + note.
export function ProfileMatchCard({ review }: { review: ReviewWithMatch }) {
  const { match } = review;
  const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <Link href={`/matches/${match.id}`} style={{ ...cardShellStyle(16), flexDirection: 'column' }} className="fb-card">
      <LeagueStripe league={match.league} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <CrestPair home={match.homeTeam} away={match.awayTeam} size={28} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: homeWon ? 700 : 500,
              color: homeWon ? 'var(--fb-text)' : 'var(--fb-text-2)',
              fontSize: 14,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.homeTeam.name}</span>
            <span className="fb-num">{match.homeScore ?? '-'}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: awayWon ? 700 : 500,
              color: awayWon ? 'var(--fb-text)' : 'var(--fb-text-2)',
              fontSize: 14,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.awayTeam.name}</span>
            <span className="fb-num">{match.awayScore ?? '-'}</span>
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--fb-border)',
          paddingTop: 10,
          marginTop: 2,
        }}
      >
        <span className="fb-num" style={{ fontSize: 11.5, color: 'var(--fb-text-3)' }}>
          <ClientDate iso={match.kickoffAt} options={{ day: '2-digit', month: '2-digit' }} fallback="" />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <StarsDisplay rating={Number(review.rating)} size={12} />
          <span className="fb-num" style={{ fontSize: 12, color: 'var(--fb-rating)' }}>
            {Number(review.rating).toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}
