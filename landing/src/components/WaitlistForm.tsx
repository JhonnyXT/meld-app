'use client';

import { useEffect, useId, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { Dictionary, Locale } from '@/i18n/config';

type Status = 'idle' | 'sending' | 'invalid' | 'error';

// ─── "Ya me anoté" compartido ───────────────────────────────────────────────
// La página tiene dos formularios (portada y cierre): al anotarse en uno, los
// dos pasan a la confirmación. Se recuerda en el navegador del visitante
// (localStorage, solo como comodidad: si falla, simplemente no se recuerda)
// para no volver a pedirle el email al regresar.
const STORAGE_KEY = 'meld-waitlist-email';
const listeners = new Set<() => void>();
let joinedEmail: string | null | undefined; // undefined = todavía no se leyó

function readJoined(): string | null {
  if (joinedEmail === undefined) {
    try {
      joinedEmail = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      joinedEmail = null;
    }
  }
  return joinedEmail;
}
function setJoined(email: string | null) {
  joinedEmail = email;
  try {
    if (email) window.localStorage.setItem(STORAGE_KEY, email);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): queda solo para esta visita.
  }
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Email con el que el visitante ya se anotó (o `null`). Lo usan los dos
 * formularios y la barra flotante. */
export function useWaitlistJoined(): string | null {
  return useSyncExternalStore(subscribe, readJoined, () => null);
}

const CELEBRATE_MS = 4500; // cuánto dura la tarjeta grande antes de contraerse

// Partículas del destello: ángulo (grados), distancia (px) y color, fijas
// para que servidor y cliente coincidan.
const SPARKS = [
  [0, 58, '#FF4B66'],
  [30, 46, '#F59E0B'],
  [60, 60, '#FF4B66'],
  [90, 50, '#22C55E'],
  [120, 58, '#FF4B66'],
  [150, 46, '#3B82F6'],
  [180, 60, '#FF4B66'],
  [210, 48, '#F59E0B'],
  [240, 58, '#FF4B66'],
  [270, 50, '#8B5CF6'],
  [300, 60, '#FF4B66'],
  [330, 46, '#22C55E'],
] as const;

function CheckBadge({ size, animated }: { size: number; animated: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="relative shrink-0"
      style={animated ? { animation: 'waitlist-pop 600ms cubic-bezier(.34,1.56,.64,1) both' } : undefined}
      aria-hidden
    >
      <circle cx="32" cy="32" r="30" fill="#d92d4a" />
      {/* El borde se "cierra" alrededor antes de que aparezca el check. */}
      <circle
        cx="32"
        cy="32"
        r="30"
        fill="none"
        stroke="#FF6B82"
        strokeWidth="3"
        strokeDasharray="189"
        transform="rotate(-90 32 32)"
        style={animated ? { animation: 'waitlist-circle 700ms ease-out 150ms both' } : { strokeDashoffset: 0 }}
      />
      <path
        d="M19 33 L28 42 L45 23"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="40"
        style={animated ? { animation: 'waitlist-draw 550ms cubic-bezier(.65,0,.35,1) 650ms both' } : undefined}
      />
    </svg>
  );
}

/** Tarjeta grande de celebración, justo después de anotarse. */
function Celebration({ t, email }: { t: Dictionary['waitlist']; email: string }) {
  const [before, after] = t.successDetail.split('{email}');
  return (
    <div role="status" aria-live="polite" className="relative flex w-full animate-row-in flex-col items-center gap-3 overflow-hidden rounded-3xl border border-line bg-surface px-5 pt-7 pb-6 text-center">
      <div className="relative flex size-20 items-center justify-center">
        {SPARKS.map(([deg, dist, color], i) => (
          <span
            key={deg}
            aria-hidden
            className="absolute size-2 rounded-full"
            style={{
              background: color,
              animation: `waitlist-spark 900ms cubic-bezier(.2,.8,.3,1) ${750 + (i % 3) * 40}ms both`,
              ['--dx' as string]: `${Math.cos((deg * Math.PI) / 180) * dist}px`,
              ['--dy' as string]: `${Math.sin((deg * Math.PI) / 180) * dist}px`,
            }}
          />
        ))}
        <span aria-hidden className="absolute inset-0 rounded-full bg-coral/25" style={{ animation: 'waitlist-ring 1100ms ease-out 700ms both' }} />
        <span aria-hidden className="absolute inset-0 rounded-full bg-coral/15" style={{ animation: 'waitlist-ring 1100ms ease-out 1000ms both' }} />
        <CheckBadge size={80} animated />
      </div>
      <p className="text-xl font-extrabold" style={{ animation: 'row-in 400ms ease-out 900ms both' }}>
        {t.success}
      </p>
      <p className="max-w-[360px] text-sm leading-relaxed text-dim" style={{ animation: 'row-in 400ms ease-out 1050ms both' }}>
        {before}
        <span className="font-semibold break-words text-ink">{email}</span>
        {after}
      </p>
      {/* Cuánto falta para que se contraiga. */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-coral/70" style={{ animation: `undo-bar ${CELEBRATE_MS}ms linear both` }} />
    </div>
  );
}

/** Confirmación compacta: después de la celebración o al volver otro día. */
function OnList({ t, email, onChange }: { t: Dictionary['waitlist']; email: string; onChange: () => void }) {
  return (
    <div role="status" className="flex w-full animate-row-in items-center gap-3 rounded-full border border-line bg-surface py-2 pr-4 pl-2 text-left">
      <CheckBadge size={34} animated={false} />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-sm font-bold">{t.onList}</span>
        <span className="truncate text-xs text-dim">{email}</span>
      </div>
      <button type="button" onClick={onChange} className="shrink-0 cursor-pointer text-xs text-faint underline underline-offset-2 hover:text-dim">
        {t.change}
      </button>
    </div>
  );
}

/** Formulario de lista de espera. En pantallas anchas es una sola cápsula
 * (campo + botón); en móvil, campo y botón apilados a todo el ancho. Al
 * anotarse, se reemplaza por la confirmación animada. */
export function WaitlistForm({
  t,
  locale,
  note,
  className = '',
}: {
  t: Dictionary['waitlist'];
  locale: Locale;
  /** Texto chico bajo el formulario; se oculta al anotarse (la confirmación ya lo dice). */
  note?: string;
  className?: string;
}) {
  const id = useId();
  const [status, setStatus] = useState<Status>('idle');
  const [celebrating, setCelebrating] = useState(false);
  // "Cambiar" vuelve a mostrar el campo SIN olvidar el email ya anotado (para
  // poder comparar al reenviar, y para no perderlo si el reenvío falla).
  const [editing, setEditing] = useState(false);
  const joined = useWaitlistJoined();

  // La tarjeta grande dura unos segundos y se contrae a la versión compacta.
  useEffect(() => {
    if (!celebrating) return;
    const id = setTimeout(() => setCelebrating(false), CELEBRATE_MS);
    return () => clearTimeout(id);
  }, [celebrating]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const alreadyJoinedWithThis = joined?.toLowerCase() === email.toLowerCase();
    setStatus('sending');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website: data.get('website'), locale }),
      });
      if (res.ok) {
        setStatus('idle');
        setEditing(false);
        // Reenviar el mismo email que ya estaba anotado no es una novedad —
        // solo celebrar cuando es distinto (o la primera vez).
        setCelebrating(!alreadyJoinedWithThis);
        setJoined(email);
      } else {
        setStatus(res.status === 400 ? 'invalid' : 'error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (joined && !editing) {
    return (
      <div className={`w-full max-w-[480px] ${className}`}>
        {celebrating ? <Celebration t={t} email={joined} /> : <OnList t={t} email={joined} onChange={() => setEditing(true)} />}
      </div>
    );
  }

  const message = status === 'invalid' ? t.invalid : status === 'error' ? t.error : null;

  return (
    <form onSubmit={onSubmit} className={`relative flex w-full max-w-[480px] flex-col gap-2.5 text-left ${className}`}>
      {/* Campo trampa anti-bots (ver /api/waitlist): fuera de pantalla y de la navegación por teclado. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
      <label htmlFor={id} className="text-[13px] font-semibold text-dim">
        {t.label}
      </label>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-2 sm:rounded-full sm:border sm:border-line sm:bg-surface sm:p-1.5">
        <input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={joined ?? undefined}
          placeholder={t.placeholder}
          aria-describedby={message ? `${id}-status` : undefined}
          className="min-h-[52px] rounded-[14px] border border-line bg-surface px-4 text-base text-ink placeholder:text-faint focus:border-coral focus:outline-none sm:min-h-11 sm:flex-1 sm:rounded-full sm:border-0 sm:bg-transparent"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-coral-btn px-[22px] text-[15px] font-bold whitespace-nowrap text-white transition-colors hover:bg-coral-btn-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-default disabled:opacity-80 sm:min-h-11 sm:rounded-full"
        >
          {status === 'sending' && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {status === 'sending' ? t.sending : t.submit}
        </button>
      </div>
      <p id={`${id}-status`} role="status" aria-live="polite" className="min-h-5 text-[13px] text-coral">
        {message}
      </p>
      {note && <p className="-mt-2 text-center text-xs text-faint sm:text-[13px]">{note}</p>}
    </form>
  );
}
