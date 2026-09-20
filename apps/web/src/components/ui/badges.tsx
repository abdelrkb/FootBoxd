// Badge live circulaire (compteur de matchs en direct par ligue). N'apparaît que si count > 0
// — c'est à l'appelant de conditionner le rendu.
export function LiveCountBadge({ count }: { count: number }) {
  return (
    <span
      className="fb-num"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 26,
        height: 24,
        padding: '0 8px',
        borderRadius: 999,
        background: 'var(--fb-live)',
        color: '#fff',
        fontWeight: 600,
        fontSize: 12.5,
        animation: 'fb-halo 1.8s ease-out infinite',
      }}
    >
      {count}
    </span>
  );
}

// Pastille de notification en exposant sur la cloche.
export function NotificationBadge({ count }: { count: number }) {
  return (
    <span
      className="fb-num"
      style={{
        position: 'absolute',
        top: -3,
        right: -3,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 19,
        height: 19,
        padding: '0 5px',
        borderRadius: 999,
        background: 'var(--fb-social)',
        color: 'var(--fb-bg)',
        fontWeight: 600,
        fontSize: 10.5,
        border: '2px solid var(--fb-bg)',
      }}
    >
      {count}
    </span>
  );
}

// Afficheur de score façon "3—1". En direct, passe en --fb-action (seul endroit où un score
// est coloré).
export function ScoreChip({ home, away, live }: { home: number | null; away: number | null; live?: boolean }) {
  return (
    <span
      className="fb-num"
      style={{
        fontWeight: 600,
        fontSize: 14,
        background: 'var(--fb-surface-2)',
        border: '1px solid var(--fb-border)',
        borderRadius: 7,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
        color: live ? 'var(--fb-action)' : undefined,
      }}
    >
      {home ?? '-'}—{away ?? '-'}
    </span>
  );
}

// Pastille "En direct" avec point clignotant (le libellé est toujours écrit — accessibilité).
export function LivePill({ minute }: { minute?: string | null }) {
  return (
    <span
      className="fb-status fb-status--live"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 11px',
        borderRadius: 999,
        background: 'var(--fb-live-bg)',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: 'var(--fb-live)',
          animation: 'fb-blink 1.1s steps(1, end) infinite',
        }}
      />
      En direct{minute ? ` ${minute}'` : ''}
    </span>
  );
}

// Pastille "Ta note" sur sa propre review (handoff design).
export function OwnRatingPill() {
  return (
    <span
      className="fb-label"
      style={{
        padding: '3px 9px',
        borderRadius: 999,
        background: 'var(--fb-rating-bg)',
        border: '1px solid var(--fb-rating)',
        color: 'var(--fb-rating)',
        fontSize: 10.5,
      }}
    >
      Ta note
    </span>
  );
}
