'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReviewWithMatch } from '@football-app/shared-types';
import { CrestPair } from './ui/crest';
import { StarsDisplay } from './ui/stars';
import { ScoreChip } from './ui/badges';
import { cardShellStyle, LeagueStripe } from './ui/card-shell';

export function ReviewMiniCard({ review }: { review: ReviewWithMatch }) {
  const { match } = review;
  const router = useRouter();
  return (
    <Link href={`/matches/${match.id}`} style={cardShellStyle()} className="fb-card">
      <CrestPair home={match.homeTeam} away={match.awayTeam} size={36} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
        <LeagueStripe league={match.league} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span className="fb-card-title">
            {match.homeTeam.name} — {match.awayTeam.name}
          </span>
          <ScoreChip home={match.homeScore} away={match.awayScore} live={match.status === 'live'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StarsDisplay rating={Number(review.rating)} />
          <span className="fb-num" style={{ color: 'var(--fb-rating)', fontSize: 12.5 }}>
            {Number(review.rating).toFixed(1)}
          </span>
          <span
            style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/profile/${review.user.id}`);
            }}
          >
            {review.user.displayName}
          </span>
        </div>
        {review.comment && (
          <p style={{ margin: '2px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--fb-text-strong-2)' }}>
            {review.comment.length > 100 ? `${review.comment.slice(0, 100)}…` : review.comment}
          </p>
        )}
        <div
          className="fb-num"
          style={{ display: 'flex', gap: 14, color: 'var(--fb-text-2)', marginTop: 4, whiteSpace: 'nowrap' }}
        >
          <span>
            <span style={{ color: 'var(--fb-social)' }}>♥</span> {review._count.likes}
          </span>
          <span>💬 {review._count.comments}</span>
        </div>
      </div>
    </Link>
  );
}
