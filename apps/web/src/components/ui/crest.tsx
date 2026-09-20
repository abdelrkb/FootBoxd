import type { CSSProperties } from 'react';

// Écusson d'équipe/ligue ou avatar utilisateur. Contrairement au handoff design (qui n'avait
// pas accès aux vraies images), on a les vraies URLs via l'API (TheSportsDB / Dicebear) — donc
// on affiche l'image réelle quand elle existe, hachure `--fb-hatch-avatar` seulement en repli.
export function Crest({
  src,
  alt,
  size,
  style,
}: {
  src: string | null | undefined;
  alt: string;
  size: number;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '999px',
    border: '1px solid var(--fb-border)',
    flexShrink: 0,
    display: 'block',
    objectFit: 'cover',
    background: 'var(--fb-hatch-avatar)',
    ...style,
  };
  if (!src) return <span aria-label={alt} style={base} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} style={base} />;
}

// Paire d'écussons superposés (repère visuel constant de l'app — voir README du handoff).
export function CrestPair({
  home,
  away,
  size,
}: {
  home: { logoUrl: string | null; name: string };
  away: { logoUrl: string | null; name: string };
  size: number;
}) {
  const overlap = Math.round(size * 0.34);
  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      <Crest src={home.logoUrl} alt={home.name} size={size} />
      <Crest src={away.logoUrl} alt={away.name} size={size} style={{ marginLeft: -overlap }} />
    </div>
  );
}
