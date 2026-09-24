'use client';

import { Mic, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CategoryId, HabitSchedule, Language } from './model';
import type { Prefill } from './QuickAddSheet';
import type { DemoStrings } from './strings';
import { parseVoiceInput } from './voiceParser';

// La Web Speech API no está en los tipos de TypeScript; solo lo que se usa.
export type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

export function getSpeechRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Convierte el resultado del parser de la app en lo que entiende Quick Add. */
function toPrefill(text: string, lang: Language): Prefill {
  const p = parseVoiceInput(text, lang);
  return {
    type: p.type,
    title: p.title,
    date: p.dateKey ?? undefined,
    time: p.type === 'habit' ? null : p.timeMinutes,
    priority: p.priority ?? undefined,
    category: (p.category?.label as CategoryId | undefined) ?? undefined,
    schedule: p.type === 'habit' ? ((p.repeat as HabitSchedule | null) ?? undefined) : undefined,
  };
}

/** "Agregar por voz" (réplica de `VoiceAddScreen`): escucha una frase, la
 * muestra en vivo y al terminar abre Quick Add pre-llenado. */
export function VoiceOverlay({ s, lang, onResult, onClose }: { s: DemoStrings; lang: Language; onResult: (p: Prefill) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'listening' | 'nothing' | 'error'>(() => (getSpeechRecognition() ? 'listening' : 'error'));
  const rec = useRef<Recognition | null>(null);
  const textRef = useRef('');

  /** Arranca el reconocedor. No toca el estado de React de forma síncrona:
   * solo desde los callbacks del reconocedor. */
  const begin = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang === 'es' ? 'es-ES' : 'en-US';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join(' ');
      textRef.current = transcript;
      setText(transcript);
    };
    r.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') setStatus('error');
    };
    r.onend = () => {
      const final = textRef.current.trim();
      if (final) onResult(toPrefill(final, lang));
      else setStatus((st) => (st === 'error' ? st : 'nothing'));
    };
    textRef.current = '';
    rec.current = r;
    r.start();
  };

  const retry = () => {
    setText('');
    setStatus('listening');
    begin();
  };

  useEffect(() => {
    begin();
    return () => rec.current?.abort();
    // Arranca a escuchar una sola vez al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listening = status === 'listening';
  return (
    <div role="dialog" aria-modal="true" aria-label={s.byVoice} className="absolute inset-0 z-30 flex flex-col items-center bg-[#0a0a0b]/95 px-6 pt-20 text-center backdrop-blur">
      <button type="button" onClick={onClose} aria-label={s.cancel} className="absolute top-14 right-5 flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-dim hover:text-ink">
        <X size={17} />
      </button>
      <span className="font-mono text-xs tracking-[0.12em] text-coral uppercase">{s.byVoice}</span>
      <p className="mt-4 min-h-[88px] text-[22px] leading-snug font-semibold" aria-live="polite">
        {text || (listening ? s.listening : status === 'nothing' ? s.heardNothing : s.voiceError)}
      </p>
      {listening && !text && <p className="text-sm text-dim">{s.speakHint}</p>}
      <div className="relative mt-auto mb-24 flex size-40 items-center justify-center">
        {listening && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-coral/20" />
            <span className="absolute inset-4 animate-pulse rounded-full bg-coral/25" />
          </>
        )}
        <button
          type="button"
          onClick={() => (listening ? rec.current?.stop() : retry())}
          aria-label={listening ? s.tapToStop : s.retry}
          className="relative flex size-24 cursor-pointer items-center justify-center rounded-full bg-[radial-gradient(circle,#FF6B82_0%,#FF4B66_60%,#d92d4a_100%)] shadow-[0_20px_50px_rgba(255,75,102,0.4)]"
        >
          <Mic size={34} className="text-white" />
        </button>
        <span className="absolute -bottom-9 text-xs whitespace-nowrap text-faint">{listening ? s.tapToStop : s.retry}</span>
      </div>
    </div>
  );
}
