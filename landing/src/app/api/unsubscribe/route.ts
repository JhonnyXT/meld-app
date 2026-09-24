import { unsubscribeEmail } from '@/lib/waitlist';
import { defaultLocale, hasLocale } from '@/i18n/config';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// GET, no POST: este endpoint se llega haciendo clic en el link "darte de
// baja" de un email (no hay formulario propio en el sitio), así que tiene
// que responder a una navegación normal del navegador.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
  const lang = hasLocale(url.searchParams.get('lang') ?? '') ? url.searchParams.get('lang')! : defaultLocale;
  const redirectTo = (ok: boolean) => Response.redirect(new URL(`/${lang}/unsubscribed?ok=${ok ? '1' : '0'}`, url), 303);

  if (!EMAIL_RE.test(email)) return redirectTo(false);

  try {
    await unsubscribeEmail(email);
    return redirectTo(true);
  } catch (err) {
    console.error('[unsubscribe] failed', err);
    return redirectTo(false);
  }
}
