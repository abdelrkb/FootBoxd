import type { RatingDistribution } from '@football-app/shared-types';

export function RatingHistogram({ distribution }: { distribution: RatingDistribution }) {
  const max = Math.max(1, ...distribution.buckets.map((b) => b.count));
  return (
    <div
      style={{
        border: '1px solid var(--fb-border)',
        borderRadius: 16,
        background: 'var(--fb-surface)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <span className="fb-section" style={{ fontSize: 13 }}>
        Notes du match
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span className="fb-num" style={{ fontWeight: 600, fontSize: 40, color: 'var(--fb-rating)', lineHeight: 1 }}>
          {distribution.average.toFixed(1)}
        </span>
        <span className="fb-label" style={{ fontSize: 11.5, color: 'var(--fb-text-3)' }}>
          moyenne sur {distribution.totalCount}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[...distribution.buckets].reverse().map((bucket) => (
          <div key={bucket.star} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="fb-num" style={{ fontSize: 11, color: 'var(--fb-text-3)', width: 28, flexShrink: 0 }}>
              {bucket.star}★
            </span>
            <span style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--fb-surface-2)', overflow: 'hidden' }}>
              <span
                style={{
                  display: 'block',
                  height: 8,
                  borderRadius: 999,
                  background: 'var(--fb-rating)',
                  width: `${(bucket.count / max) * 100}%`,
                }}
              />
            </span>
            <span
              className="fb-num"
              style={{ fontSize: 11, color: 'var(--fb-text-3)', width: 26, textAlign: 'right', flexShrink: 0 }}
            >
              {bucket.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
