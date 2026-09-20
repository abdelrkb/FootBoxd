'use client';

import type { ButtonHTMLAttributes, CSSProperties } from 'react';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
type Size = 'lg' | 'md' | 'sm';

const HEIGHTS: Record<Size, number> = { lg: 50, md: 44, sm: 36 };

const VARIANT_STYLE: Record<Variant, CSSProperties> = {
  primary: { background: 'var(--fb-action)', color: 'var(--fb-bg)', border: 'none', fontWeight: 800 },
  secondary: { background: 'transparent', color: 'var(--fb-text)', border: '1px solid var(--fb-border)', fontWeight: 700 },
  tertiary: { background: 'transparent', color: 'var(--fb-text-2)', border: 'none', fontWeight: 700 },
  destructive: {
    background: 'transparent',
    color: 'var(--fb-live-text)',
    border: '1px solid rgba(255,59,47,0.4)',
    fontWeight: 700,
  },
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, style, ...rest }: Props) {
  const variantStyle = disabled
    ? { background: 'var(--fb-surface-2)', color: 'var(--fb-disabled-fg)', border: 'none' }
    : loading
      ? { background: 'var(--fb-action-pressed)', color: 'var(--fb-bg)', border: 'none' }
      : VARIANT_STYLE[variant];

  return (
    <button
      disabled={disabled || loading}
      style={{
        height: HEIGHTS[size],
        padding: '0 20px',
        borderRadius: 999,
        fontFamily: 'var(--fb-font-sans)',
        fontStretch: 'var(--fb-width-label)',
        fontSize: 13,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : loading ? 'progress' : 'pointer',
        whiteSpace: 'nowrap',
        ...variantStyle,
        ...style,
      }}
      {...rest}
    >
      {loading ? 'Envoi…' : children}
    </button>
  );
}

// Bouton de connexion externe (Google/Apple) : pleine largeur, jamais coloré.
export function OAuthButton({ href, logoSrc, label }: { href: string; logoSrc?: string; label: string }) {
  return (
    <a
      href={href}
      style={{
        height: 48,
        width: '100%',
        border: '1px solid var(--fb-border)',
        borderRadius: 12,
        background: 'var(--fb-surface-2)',
        color: 'var(--fb-text)',
        fontFamily: 'var(--fb-font-sans)',
        fontWeight: 600,
        fontSize: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          background: logoSrc ? undefined : 'var(--fb-hatch-avatar)',
          border: logoSrc ? 'none' : '1px dashed var(--fb-border-strong)',
          flexShrink: 0,
          backgroundImage: logoSrc ? `url(${logoSrc})` : undefined,
          backgroundSize: 'contain',
        }}
      />
      {label}
    </a>
  );
}
