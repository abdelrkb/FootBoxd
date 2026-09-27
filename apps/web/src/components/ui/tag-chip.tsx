import type { ReactNode } from 'react';
import { hexToRgba, tagHoloBackground, tagHoloBorder } from '../../lib/tag-colors';

// Rendu du tag à la fois dans le champ (avec croix pour retirer) et à l'affichage sous le
// commentaire d'une review publiée (sans croix) — voir tag-input.tsx et
// matches/[id]/developed-review-card.tsx. Style "holographique" (verre translucide + reflet) :
// fond en dégradé semi-transparent, bord teinté, flou derrière, léger reflet clair en haut.
export function TagChip({
  color,
  colorEnd,
  onRemove,
  children,
}: {
  color: string;
  colorEnd?: string | null;
  onRemove?: () => void;
  children: ReactNode;
}) {
  return (
    <span
      className="fb-label"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 26,
        padding: onRemove ? '0 6px 0 12px' : '0 12px',
        borderRadius: 999,
        fontSize: 12,
        color: 'var(--fb-text)',
        background: tagHoloBackground(color, colorEnd),
        border: tagHoloBorder(color, colorEnd),
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 14px ${hexToRgba(colorEnd ?? color, 0.2)}`,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Retirer le tag"
          style={{
            width: 16,
            height: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 999,
            background: 'rgba(0,0,0,0.25)',
            color: 'var(--fb-text)',
            fontSize: 11,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
