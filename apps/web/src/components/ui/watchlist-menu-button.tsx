'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { useWatchlist } from '../../lib/watchlist-context';

// Bouton "⋮" à poser sur une carte de match (fb-card) ou la page de détail : ouvre un petit
// menu avec une seule entrée pour ajouter/retirer le match de la watchlist. stopPropagation +
// preventDefault car ces cartes sont presque toujours un <Link> englobant (même pattern que
// review-mini-card.tsx pour son lien vers le profil de l'auteur).
export function WatchlistMenuButton({ matchId }: { matchId: string }) {
  const { user } = useAuth();
  const { isInWatchlist, toggle } = useWatchlist();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!user) return null;

  const inWatchlist = isInWatchlist(matchId);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    try {
      await toggle(matchId);
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <div
      ref={ref}
      style={{ position: 'relative', flexShrink: 0 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Options du match"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          border: 'none',
          background: open ? 'var(--fb-surface-2)' : 'transparent',
          color: 'var(--fb-text-2)',
          cursor: 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            zIndex: 20,
            minWidth: 220,
            padding: 4,
            border: '1px solid var(--fb-border)',
            borderRadius: 10,
            background: 'var(--fb-surface)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          <button
            role="menuitem"
            onClick={handleToggle}
            disabled={pending}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 7,
              border: 'none',
              background: 'none',
              color: inWatchlist ? 'var(--fb-live-text)' : 'var(--fb-text)',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: pending ? 'progress' : 'pointer',
            }}
          >
            {inWatchlist ? 'Retirer de la watchlist' : 'Ajouter à la watchlist'}
          </button>
        </div>
      )}
    </div>
  );
}
