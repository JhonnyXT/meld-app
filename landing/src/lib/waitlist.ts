// Lista de espera → contactos de Resend, en la MISMA audiencia que usa
// `my-wallet-app/landing` (repo hermano) — separados por segmento y topic para
// no mezclar sus listas ni sus bajas:
// - Segmento `Meld — Waitlist` (RESEND_SEGMENT_ID): agrupa a quien se anota
//   aquí, para poder mandarle una campaña solo a esta lista.
// - Topic `Meld — Lanzamiento` (RESEND_TOPIC_ID): suscripción propia de Meld.
//   Darse de baja hace opt_out de este topic, no del `unsubscribed` global
//   del contacto (que también saca a la persona de MyWallet si comparte
//   cuenta) — ver `unsubscribeEmail()` más abajo.
//
// Variables de entorno (Vercel → Settings → Environment Variables, o
// `landing/.env.local` en desarrollo):
// - RESEND_API_KEY    (obligatoria) API key con permiso de contactos.
// - RESEND_SEGMENT_ID (opcional, default abajo) segmento de la lista de espera.
// - RESEND_TOPIC_ID   (opcional, default abajo) topic del lanzamiento.
//
// Sin RESEND_API_KEY: en desarrollo el email solo se loguea; en producción
// se lanza `WaitlistNotConfiguredError` (el endpoint responde 503) en vez de
// fingir que se guardó — nunca perder un email en silencio.

const RESEND_BASE = 'https://api.resend.com/contacts';

// Defaults de esta audiencia (misma cuenta de Resend que MyWallet) — creados
// a mano en el dashboard el 2026-09-24. Sobreescribibles por env var si algún
// día se recrean o se mueve de audiencia.
const DEFAULT_SEGMENT_ID = '5e91911d-7d8b-4d44-a320-3a288aba61cb';
const DEFAULT_TOPIC_ID = '53887fa0-e713-48da-91d3-80974e28e3fb';

export class WaitlistNotConfiguredError extends Error {}

function requireApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new WaitlistNotConfiguredError('RESEND_API_KEY is not set');
  return apiKey;
}

function segmentId(): string {
  return process.env.RESEND_SEGMENT_ID || DEFAULT_SEGMENT_ID;
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

export async function saveEmail(email: string, locale: string): Promise<void> {
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production') {
    console.log(`[waitlist] (dev, sin RESEND_API_KEY) ${email} · ${locale}`);
    return;
  }
  const apiKey = requireApiKey();

  // Crear el contacto. Si ya existe (anotado antes, o ya es contacto de
  // MyWallet en esta misma cuenta), Resend responde "already exists" — no es
  // un error: seguimos igual a agregarlo al segmento y al topic de Meld más
  // abajo, para que anotarse aquí funcione también para quien ya estaba en la
  // audiencia por otro motivo.
  const createRes = await resendFetch(apiKey, '', {
    method: 'POST',
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  if (!createRes.ok) {
    const msg = await parseError(createRes);
    if (!/already exist/i.test(msg)) throw new Error(msg);
  }

  const [segRes, topicRes] = await Promise.all([
    resendFetch(apiKey, `/${encodeURIComponent(email)}/segments/${segmentId()}`, { method: 'POST' }),
    resendFetch(apiKey, `/${encodeURIComponent(email)}/topics`, {
      method: 'PATCH',
      body: JSON.stringify([{ id: topicId(), subscription: 'opt_in' }]),
    }),
  ]);
  if (!segRes.ok) throw new Error(await parseError(segRes));
  if (!topicRes.ok) throw new Error(await parseError(topicRes));
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
