import { saveEmail, WaitlistNotConfiguredError } from '@/lib/waitlist';
import { defaultLocale, hasLocale } from '@/i18n/config';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; locale?: unknown; website?: unknown } | null;
  // Campo trampa: invisible para personas, los bots lo suelen llenar. Se
  // responde OK sin guardar nada para no darles pistas.
  if (typeof body?.website === 'string' && body.website !== '') return Response.json({ ok: true });
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const locale = typeof body?.locale === 'string' && hasLocale(body.locale) ? body.locale : defaultLocale;

  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }

  try {
    await saveEmail(email, locale);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof WaitlistNotConfiguredError) {
      return Response.json({ error: 'not_configured' }, { status: 503 });
    }
    console.error('[waitlist] save failed', err);
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
