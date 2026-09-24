// Lista de espera → contactos de Resend (`POST https://api.resend.com/contacts`).
//
// Variables de entorno (Vercel → Settings → Environment Variables, o
// `landing/.env.local` en desarrollo):
// - RESEND_API_KEY      (obligatoria) API key con permiso para contactos.
// - RESEND_SEGMENT_ID   (opcional)    segmento de Resend donde agrupar a
//                                     la lista de espera.
//
// Sin RESEND_API_KEY: en desarrollo el email solo se loguea; en producción
// se lanza `WaitlistNotConfiguredError` (el endpoint responde 503) en vez de
// fingir que se guardó — nunca perder un email en silencio.

const RESEND_CONTACTS_URL = 'https://api.resend.com/contacts';

export class WaitlistNotConfiguredError extends Error {}

export async function saveEmail(email: string, locale: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[waitlist] (dev, sin RESEND_API_KEY) ${email} · ${locale}`);
      return;
    }
    throw new WaitlistNotConfiguredError('RESEND_API_KEY is not set');
  }

  const segmentId = process.env.RESEND_SEGMENT_ID;
  const res = await fetch(RESEND_CONTACTS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      unsubscribed: false,
      ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
    }),
    cache: 'no-store',
  });
  if (res.ok) return;

  const body = (await res.json().catch(() => null)) as { name?: string; message?: string } | null;
  // Anotarse dos veces con el mismo email no es un error para quien lo
  // intenta: ya está en la lista.
  if (body?.message && /already exist/i.test(body.message)) return;
  throw new Error(`Resend ${res.status}: ${body?.name ?? ''} ${body?.message ?? ''}`.trim());
}

/** Baja de la lista de espera — `PATCH /contacts/{email}` (Resend deja
 * actualizar por email además de por id, no hace falta buscar el id
 * primero). Usado por `/api/unsubscribe`, pensado para el link "darte de
 * baja" de un futuro email de lanzamiento (todavía no existe ese email:
 * esto es la infraestructura, lista para cuando se envíe). Si el contacto
 * no existe, Resend responde 404 — se trata igual como éxito: el resultado
 * que le importa a quien hace clic es "ya no estás en la lista", y eso ya
 * es cierto. */
export async function unsubscribeEmail(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[waitlist] (dev, sin RESEND_API_KEY) baja: ${email}`);
      return;
    }
    throw new WaitlistNotConfiguredError('RESEND_API_KEY is not set');
  }

  const res = await fetch(`${RESEND_CONTACTS_URL}/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ unsubscribed: true }),
    cache: 'no-store',
  });
  if (res.ok || res.status === 404) return;

  const body = (await res.json().catch(() => null)) as { name?: string; message?: string } | null;
  throw new Error(`Resend ${res.status}: ${body?.name ?? ''} ${body?.message ?? ''}`.trim());
}
