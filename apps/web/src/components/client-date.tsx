'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

// i18n (issue #27, 2026-10-22) : la date suit la langue ACTIVE de l'app (next-intl), pas la
// locale brute du système — sinon basculer l'app en anglais laisserait les dates au format
// français si l'OS est en français. Reste différé au montage client (useEffect ne s'exécute
// jamais pendant le SSR) pour ne jamais provoquer de mismatch d'hydratation : le serveur
// affiche un texte neutre, le format localisé arrive après coup.
export function ClientDate({
  iso,
  options,
  fallback = '',
}: {
  iso: string;
  options: Intl.DateTimeFormatOptions;
  fallback?: string;
}) {
  const locale = useLocale();
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    setFormatted(new Date(iso).toLocaleString(locale, options));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso, locale, JSON.stringify(options)]);

  return <>{formatted ?? fallback}</>;
}
