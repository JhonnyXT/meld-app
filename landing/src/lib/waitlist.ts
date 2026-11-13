// ver docs/adr/0001-baja-es-opt-out-de-topic-no-global.md
const RESEND_BASE = 'https://api.resend.com/contacts';

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
