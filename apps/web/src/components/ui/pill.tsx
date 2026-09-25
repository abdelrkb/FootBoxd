import type { ReactNode } from 'react';

export function Pill({
  selected,
  onClick,
  children,
  compact,
}: {
  selected: boolean;
  onClick?: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="fb-label"
      style={{
        padding: compact ? '10px 4px' : '10px 14px',
        borderRadius: 999,
        fontSize: compact ? 11 : 12.5,
        whiteSpace: 'nowrap',
        // compact : les pilules se partagent la largeur disponible au lieu de déborder/passer à la ligne
        ...(compact ? { flex: '1 1 0', minWidth: 0, overflow: 'hidden', textOverflow: 'clip' } : {}),
        background: selected ? 'var(--fb-action)' : 'transparent',
        color: selected ? 'var(--fb-bg)' : 'var(--fb-text-2)',
        border: selected ? 'none' : '1px solid var(--fb-border)',
      }}
    >
      {children}
    </button>
  );
}
