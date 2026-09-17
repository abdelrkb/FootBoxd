'use client';

import { useEffect, useState } from 'react';

// Formate une date avec la locale réelle du navigateur, sans jamais provoquer de mismatch
// d'hydratation : le serveur ne peut pas connaître la locale du client, donc on affiche un
// texte neutre le temps du premier rendu, puis on bascule sur le format localisé une fois
// monté côté client (useEffect ne s'exécute jamais pendant le SSR).
export function ClientDate({
  iso,
  options,
  fallback = '',
}: {
  iso: string;
  options: Intl.DateTimeFormatOptions;
  fallback?: string;
}) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    setFormatted(new Date(iso).toLocaleString(undefined, options));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso, JSON.stringify(options)]);

  return <>{formatted ?? fallback}</>;
}
