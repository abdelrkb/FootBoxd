export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 50,
        height: 28,
        borderRadius: 999,
        border: 'none',
        background: checked ? 'var(--fb-action)' : 'var(--fb-surface-2)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 4,
          left: checked ? 26 : 4,
          width: 20,
          height: 20,
          borderRadius: 999,
          background: checked ? 'var(--fb-bg)' : 'var(--fb-text-3)',
        }}
      />
    </button>
  );
}
