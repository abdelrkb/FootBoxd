'use client';

import { useEffect, useRef, useState } from 'react';
import type { Match } from '@football-app/shared-types';
import { useAuth } from '../../lib/auth-context';
import { LogMatchModal } from '../log-match-modal';

// Bouton "★" à poser sur une carte de match (fb-card) — même pattern que WatchlistMenuButton
// (stopPropagation car ces cartes sont presque toujours un <Link> englobant). Ouvre un petit
// menu avec deux entrées distinctes (issue #15, décision produit du 2026-10-22) : "Noter" (juste
// les étoiles, n'apparaît jamais dans les flux de logs) et "Logger" (formulaire complet,
// identique à celui de la fiche du match) — pas un seul bouton, les deux usages sont volontai-
// rement différents. Caché si le match n'est pas terminé (règle déjà appliquée côté API).
export function LogMatchMenuButton({ match }: { match: Match }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'quick' | 'full' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!user || match.status !== 'finished') return null;

  return (
    <>
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
          aria-label="Noter ou logger ce match"
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
            color: 'var(--fb-rating)',
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          ★
        </button>

        {open && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              zIndex: 20,
              minWidth: 180,
              padding: 4,
              border: '1px solid var(--fb-border)',
              borderRadius: 10,
              background: 'var(--fb-surface)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setModalMode('quick');
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 7,
                border: 'none',
                background: 'none',
                color: 'var(--fb-text)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Noter
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setModalMode('full');
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 7,
                border: 'none',
                background: 'none',
                color: 'var(--fb-text)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Logger
            </button>
          </div>
        )}
      </div>

      {modalMode && <LogMatchModal match={match} mode={modalMode} onClose={() => setModalMode(null)} />}
    </>
  );
}
