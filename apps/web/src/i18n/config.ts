// i18n (issue #27) : FR + EN pour le lancement, français par défaut/repli — c'est la langue
// dans laquelle l'app a été écrite, donc le choix le plus sûr quand rien d'autre n'indique de
// préférence (langue système non reconnue, pas de cookie encore posé).
export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const LOCALE_COOKIE = 'NEXT_LOCALE';

// Lu/écrit côté client uniquement (settings, auth-context) — la pose initiale (détection
// Accept-Language) reste dans proxy.ts, côté serveur, pour éviter tout flash.
export function getLocaleCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}
