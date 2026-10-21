'use client';

import type { CSSProperties, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// Un avatar uploadé (2026-10-02, stocké en base faute de Cloudflare R2 — voir users.service.ts)
// est servi par l'API sur sa propre origine, pas par le frontend : `avatarUrl` contient alors
// un chemin relatif (`/users/:id/avatar?v=...`), à préfixer par l'URL de l'API. Les URLs
// Dicebear/Google (déjà absolues) traversent cette fonction sans changement.
function resolveSrc(src: string): string {
  return src.startsWith('/') ? `${API_URL}${src}` : src;
}

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
  return <img src={resolveSrc(src)} alt={alt} width={size} height={size} style={base} />;
}

// Paire d'écussons superposés (repère visuel constant de l'app — voir README du handoff).
// Toujours utilisée pour une paire domicile/extérieur dans le contexte d'un match (jamais pour
// autre chose) — chaque écusson mène à sa page équipe (issue #7, 2026-10-20). Souvent affichée
// à l'intérieur d'une ligne de match elle-même cliquable (→ la page du match) : un <Link>
// imbriqué dans un <Link> serait du HTML invalide, donc navigation manuelle + stopPropagation
// sur un simple <span>, plutôt qu'un vrai <Link> ici.
export function CrestPair({
  home,
  away,
  size,
}: {
  home: { id: string; logoUrl: string | null; name: string };
  away: { id: string; logoUrl: string | null; name: string };
  size: number;
}) {
  const router = useRouter();
  const overlap = Math.round(size * 0.34);

  function goToTeam(teamId: string) {
    return (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/teams/${teamId}`);
    };
  }

  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      <span onClick={goToTeam(home.id)} style={{ cursor: 'pointer' }}>
        <Crest src={home.logoUrl} alt={home.name} size={size} />
      </span>
      <span onClick={goToTeam(away.id)} style={{ cursor: 'pointer', marginLeft: -overlap }}>
        <Crest src={away.logoUrl} alt={away.name} size={size} />
      </span>
    </div>
  );
}

// "{domicile} — {extérieur}" avec chaque nom cliquable vers sa page équipe (issue #7) — même
// contrainte que CrestPair (souvent nichée dans une ligne de match déjà cliquable), même
// technique de navigation manuelle + stopPropagation plutôt que des <Link> imbriqués.
export function TeamNamePair({
  home,
  away,
  className,
  style,
}: {
  home: { id: string; name: string };
  away: { id: string; name: string };
  className?: string;
  style?: CSSProperties;
}) {
  const router = useRouter();

  function goToTeam(teamId: string) {
    return (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/teams/${teamId}`);
    };
  }

  return (
    <span className={className} style={style}>
      <span onClick={goToTeam(home.id)} style={{ cursor: 'pointer' }}>
        {home.name}
      </span>
      {' — '}
      <span onClick={goToTeam(away.id)} style={{ cursor: 'pointer' }}>
        {away.name}
      </span>
    </span>
  );
}
