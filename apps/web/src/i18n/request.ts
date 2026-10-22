import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, LOCALE_COOKIE } from './config';

// Pas de routing par préfixe d'URL (issue #27, décision produit du 2026-10-22) : la langue vient
// du cookie posé par proxy.ts (auto-détecté à la première visite, ou choisi dans les
// réglages) — jamais d'un segment d'URL. `defaultLocale` est un repli défensif, le middleware
// pose toujours ce cookie en pratique.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = cookieValue && isLocale(cookieValue) ? cookieValue : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
