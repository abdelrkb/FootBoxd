import Link from 'next/link';
import type { ReviewWithMatch } from '@football-app/shared-types';

export function ReviewMiniCard({ review }: { review: ReviewWithMatch }) {
  return (
    <Link
      href={`/matches/${review.match.id}`}
      style={{
        display: 'block',
        padding: '0.75rem',
        border: '1px solid #333',
        borderRadius: 8,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
        {review.match.homeTeam.name} — {review.match.awayTeam.name}
      </p>
      <p style={{ margin: '0.25rem 0' }}>
        <strong>{review.user.displayName}</strong> — {review.rating}/5
      </p>
      {review.comment && (
        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }}>
          {review.comment.length > 100 ? `${review.comment.slice(0, 100)}...` : review.comment}
        </p>
      )}
      <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', opacity: 0.6 }}>
        {review._count.likes} j'aime · {review._count.comments} commentaire(s)
      </p>
    </Link>
  );
}
