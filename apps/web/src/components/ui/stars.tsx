'use client';

import { useState } from 'react';

// Affichage d'une note en étoiles, jamais une demi-étoile pleine (technique imposée par le
// handoff design) : 5 étoiles vides en superposition, avec un calque coloré dont la largeur
// vaut note/5 en %.
export function StarsDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  const pct = Math.max(0, Math.min(1, rating / 5)) * 100;
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        whiteSpace: 'nowrap',
        fontSize: size,
        letterSpacing: '0.06em',
        color: 'var(--fb-star-empty)',
      }}
    >
      ★★★★★
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          color: 'var(--fb-rating)',
          width: `${pct}%`,
        }}
      >
        ★★★★★
      </span>
    </span>
  );
}

const HALVES = Array.from({ length: 10 }, (_, i) => (i + 1) / 2);

// Sélecteur de note du formulaire "Logger le match" : 10 zones cliquables invisibles par-dessus
// les 5 étoiles, aperçu au survol, retour à la valeur choisie à la sortie du conteneur.
export function StarsSelector({
  value,
  onChange,
  size = 34,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const displayed = hover || value;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', display: 'flex', gap: 4 }} onMouseLeave={() => setHover(0)}>
        <StarsDisplay rating={displayed} size={size * 0.9} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          {HALVES.map((v) => (
            <span
              key={v}
              onClick={() => onChange(v)}
              onMouseEnter={() => setHover(v)}
              style={{ flex: 1, cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>
      <span
        className="fb-num"
        style={{ fontSize: 22, color: 'var(--fb-rating)', whiteSpace: 'nowrap' }}
      >
        {displayed.toFixed(1)}/5
      </span>
    </div>
  );
}
