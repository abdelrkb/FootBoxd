import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, LOCALE_COOKIE } from './i18n/config';

// Pose le cookie de langue à la première visite, à partir de l'en-tête Accept-Language du
// navigateur (issue #27 : "en fonction de la langue système de l'utilisateur") — fait ici,
// côté serveur, pour que le tout premier rendu soit déjà dans la bonne langue (pas de flash en
// français puis bascule après coup). Ne touche jamais un cookie déjà posé : une fois choisie
// (auto ou manuellement dans les réglages), la langue reste stable tant que l'utilisateur ne la
// change pas lui-même.
function pickLocaleFromHeader(header: string | null): string {
  if (!header) return defaultLocale;
  const candidates = header
    .split(',')
    .map((part) => part.split(';')[0]?.trim().split('-')[0]?.toLowerCase())
    .filter((lang): lang is string => !!lang);
  return candidates.find(isLocale) ?? defaultLocale;
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (request.cookies.has(LOCALE_COOKIE)) return response;

  const locale = pickLocaleFromHeader(request.headers.get('accept-language'));
  response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  // Exclut les assets statiques/API internes Next — inutile d'y poser le cookie.
  matcher: ['/((?!_next|favicon.ico).*)'],
};
