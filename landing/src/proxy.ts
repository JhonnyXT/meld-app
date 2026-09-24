import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales } from '@/i18n/config';

// Toda ruta vive bajo /es o /en. Si llega una sin idioma (p. ej. `/`), se
// redirige al que prefiera el navegador (`Accept-Language`), español por
// defecto.
function preferredLocale(request: NextRequest): string {
  const languages = new Negotiator({
    headers: { 'accept-language': request.headers.get('accept-language') ?? '' },
  }).languages();
  try {
    return match(languages, [...locales], defaultLocale);
  } catch {
    return defaultLocale;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return;

  request.nextUrl.pathname = `/${preferredLocale(request)}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Fuera: internos de Next, la API y cualquier archivo con extensión
  // (imágenes de /public, favicon, robots, etc.).
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
