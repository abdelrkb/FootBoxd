'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '../../lib/auth-context';

// Seul réglage réellement actif pour l'instant parmi les 5 de l'onboarding/réglages (décision
// produit du 2026-09-20 — les autres sont stockés sans effet). Purement front : masque le score
// derrière un clic tant que l'utilisateur ne l'a pas révélé.
export function SpoilerScore({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(false);

  if (!user?.hideScoresUntilClick || revealed) return <>{children}</>;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setRevealed(true);
      }}
      className="fb-label"
      style={{
        border: '1px solid var(--fb-border)',
        borderRadius: 7,
        background: 'var(--fb-hatch)',
        padding: '3px 10px',
        fontSize: 10.5,
        color: 'var(--fb-text-3)',
      }}
    >
      Afficher le score
    </button>
  );
}
