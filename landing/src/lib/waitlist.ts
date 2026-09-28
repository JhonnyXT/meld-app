// Baja de la lista de espera de Meld (topic `Meld — Lanzamiento` en Resend). Las altas viven en
// joblan (joblanstudio.vercel.app/?app=…#avisame), que escribe en el mismo segmento y topic de
// siempre, en la cuenta que comparte con `my-wallet-app/landing`.
//
// Variables de entorno: RESEND_API_KEY (obligatoria) y RESEND_TOPIC_ID (opcional, default abajo).
// Sin RESEND_API_KEY: en desarrollo solo se loguea; en producción se lanza
// `WaitlistNotConfiguredError` en vez de fingir que se procesó la baja.

const RESEND_BASE = 'https://api.resend.com/contacts';

// Topic creado a mano en el dashboard el 2026-09-24; sobreescribible por env var.
const DEFAULT_TOPIC_ID = '53887fa0-e713-48da-91d3-80974e28e3fb';

export class WaitlistNotConfiguredError extends Error {}

function requireApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new WaitlistNotConfiguredError('RESEND_API_KEY is not set');
  return apiKey;
}

function topicId(): string {
  return process.env.RESEND_TOPIC_ID || DEFAULT_TOPIC_ID;
}

async function resendFetch(apiKey: string, path: string, init: RequestInit): Promise<Response> {
  return fetch(`${RESEND_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  });
}

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { name?: string; message?: string } | null;
  return `Resend ${res.status}: ${body?.name ?? ''} ${body?.message ?? ''}`.trim();
}

/** Baja de la lista de espera de Meld — opt_out del topic
 * `Meld — Lanzamiento`, NO `unsubscribed: true` del contacto (eso sería una
 * baja global de la cuenta de Resend, y sacaría a la persona también de
 * MyWallet si comparte el mismo email). Usado por `/api/unsubscribe`,
 * pensado para el link "darte de baja" de un futuro email de lanzamiento
 * (todavía no existe ese email: esto es la infraestructura, lista para
 * cuando se envíe). Si el contacto no existe, Resend responde 404 — se
 * trata igual como éxito: el resultado que le importa a quien hace clic es
 * "ya no estás en la lista", y eso ya es cierto. */
export async function unsubscribeEmail(email: string): Promise<void> {
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production') {
    console.log(`[waitlist] (dev, sin RESEND_API_KEY) baja: ${email}`);
    return;
  }
  const apiKey = requireApiKey();

  const res = await resendFetch(apiKey, `/${encodeURIComponent(email)}/topics`, {
    method: 'PATCH',
    body: JSON.stringify([{ id: topicId(), subscription: 'opt_out' }]),
  });
  if (res.ok || res.status === 404) return;
  throw new Error(await parseError(res));
}
