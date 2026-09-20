import type { ReactNode } from 'react';

export function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="fb-label"
      style={{
        padding: '10px 14px',
        borderRadius: 999,
        fontSize: 12.5,
        whiteSpace: 'nowrap',
        background: selected ? 'var(--fb-action)' : 'transparent',
        color: selected ? 'var(--fb-bg)' : 'var(--fb-text-2)',
        border: selected ? 'none' : '1px solid var(--fb-border)',
      }}
    >
      {children}
    </button>
  );
}
