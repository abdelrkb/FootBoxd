import type { ReactNode } from 'react';

// Vide de contenu (aucun match, aucune review...) : cadre pointillé hachuré, aucune action.
export function EmptyContent({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div
      style={{
        padding: '24px 18px',
        border: '1px dashed var(--fb-border-strong)',
        borderRadius: 12,
        background: 'var(--fb-hatch)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems: 'flex-start',
      }}
    >
      <span className="fb-card-title" style={{ fontSize: 16 }}>
        {title}
      </span>
      {subtitle && <span style={{ fontSize: 14, color: 'var(--fb-text-2)' }}>{subtitle}</span>}
    </div>
  );
}

// Vide social (pas connecté, ne suit personne) : cadre plein + un bouton — une invitation.
export function EmptySocial({ title, subtitle, action }: { title: string; subtitle: string; action: ReactNode }) {
  return (
    <div
      style={{
        padding: '22px 18px',
        border: '1px solid var(--fb-border)',
        borderRadius: 12,
        background: 'var(--fb-bg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <span className="fb-card-title" style={{ fontSize: 16 }}>
        {title}
      </span>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fb-text-2)' }}>{subtitle}</span>
      {action}
    </div>
  );
}
