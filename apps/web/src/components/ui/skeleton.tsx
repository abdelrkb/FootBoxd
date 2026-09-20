// Squelette de chargement : reprend la géométrie de la carte réelle, ne dit jamais
// "Chargement..." en texte nu (handoff design).
export function SkeletonRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        padding: 14,
        border: '1px solid var(--fb-border)',
        borderRadius: 12,
        background: 'var(--fb-bg)',
        animation: `fb-skel 1.4s ease-in-out ${delay}s infinite`,
      }}
    >
      <span style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--fb-surface-2)', flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        <span style={{ height: 11, width: '62%', borderRadius: 999, background: 'var(--fb-surface-2)' }} />
        <span style={{ height: 9, width: '38%', borderRadius: 999, background: 'var(--fb-surface-3)' }} />
      </span>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} delay={i * 0.1} />
      ))}
    </div>
  );
}
