import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Field({ label, hint, error, ...rest }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label className="fb-label" style={{ fontSize: 11.5, color: error ? 'var(--fb-live-text)' : 'var(--fb-text-2)' }}>
        {label}
      </label>
      <input
        {...rest}
        style={{
          height: 46,
          boxSizing: 'border-box',
          padding: '0 14px',
          border: `1px solid ${error ? 'var(--fb-live)' : 'var(--fb-border)'}`,
          borderRadius: 12,
          background: 'var(--fb-bg)',
          color: 'var(--fb-text)',
          fontFamily: 'var(--fb-font-sans)',
          fontSize: 15,
        }}
      />
      {hint && !error && (
        <span className="fb-meta" style={{ fontSize: 11 }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fb-live-text)' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--fb-live)' }} />
          {error}
        </span>
      )}
    </div>
  );
}
