'use client';

import { Bell, CalendarDays, Check as CheckIcon, Clock, Mic, Pause, Play, Repeat as RepeatIcon, Square, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { mmss } from './DemoRow';
import { HealthAutoTrackFieldRow } from './quickAdd/AutoTrackModal';
import { DatePickerModal } from './quickAdd/DatePickerModal';
import { DurationPickerModal } from './quickAdd/DurationPickerModal';
import { CategoryAccordion, FieldRow, LinkFieldRow, PresetAccordion, PriorityAccordion } from './quickAdd/FieldParts';
import { TimePickerModal } from './quickAdd/TimePickerModal';
import { TypeTabs } from './quickAdd/TypeTabs';
import { dayTitle } from './dateFormat';
import {
  clock12,
  presetLabel,
  EARLY_ALERT_OPTIONS,
  HABIT_PREFERRED_TIMES,
  HABIT_SCHEDULES,
  REPEAT_OPTIONS,
  type CategoryId,
  type DemoItem,
  type EarlyAlert,
  type HabitPreferredTime,
  type HabitSchedule,
  type ItemType,
  type Language,
  type PriorityLevel,
  type RepeatOption,
} from './model';
import type { DemoStrings } from './strings';
import { getSpeechRecognition, type Recognition } from './VoiceOverlay';

/** Lo que Quick Add sabe pre-llenar (desde el dictado por voz). */
export type Prefill = Partial<Pick<DemoItem, 'type' | 'title' | 'date' | 'time' | 'priority' | 'category' | 'schedule'>>;

const DEFAULT_EVENT_START = 16 * 60 + 30; // 4:30 PM, mismo default que la app

function labelsFor(lang: Language, options: readonly string[]): Record<string, string> {
  return Object.fromEntries(options.map((o) => [o, presetLabel(o, lang)]));
}

// ─── Dictado del título (réplica de `useVoiceDictation`) ────────────────────
function useTitleDictation(lang: Language, setTitle: (value: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const supported = getSpeechRecognition() !== null;

  useEffect(() => () => rec.current?.abort(), []);

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang === 'es' ? 'es-ES' : 'en-US';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) =>
      setTitle(
        Array.from(e.results)
          .map((res) => res[0].transcript)
          .join(' '),
      );
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  return { listening, toggle, supported };
}

// ─── Nota de voz — 3 estados (réplica de `VoiceRecordRow`) ──────────────────
const WAVEFORM = [6, 14, 9, 18, 11, 16, 7, 13, 10, 15, 8, 12];

function VoiceRecordField({
  s,
  value,
  onChange,
}: {
  s: DemoStrings;
  value: { url: string | null; sec: number };
  onChange: (v: { url: string | null; sec: number }) => void;
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'error'>('idle');
  const [paused, setPaused] = useState(false);
  const [sec, setSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const secRef = useRef(0);

  useEffect(() => {
    if (state !== 'recording' || paused) return;
    const id = setInterval(() => {
      secRef.current += 1;
      setSec(secRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [state, paused]);
  useEffect(() => () => audio.current?.pause(), []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        onChange({ url: URL.createObjectURL(new Blob(chunks, { type: r.mimeType })), sec: Math.max(1, secRef.current) });
        setState('idle');
        setPaused(false);
      };
      rec.current = r;
      secRef.current = 0;
      setSec(0);
      r.start();
      setState('recording');
    } catch {
      setState('error');
    }
  };

  const togglePlay = () => {
    if (!value.url) return;
    if (!audio.current) {
      audio.current = new Audio(value.url);
      audio.current.onended = () => setPlaying(false);
    }
    if (playing) audio.current.pause();
    else void audio.current.play();
    setPlaying(!playing);
  };

  if (state === 'recording') {
    return (
      <div className="mb-3.5 flex flex-col gap-3 rounded-2xl bg-surface-2 p-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className={`size-2.5 rounded-full bg-[#E5484D] ${paused ? '' : 'animate-pulse'}`} />
            <span className="text-[15px] font-semibold">{s.qa.recordingLabel}</span>
          </span>
          <span className="font-mono text-[15px] font-semibold">{mmss(sec)}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (paused) {
                rec.current?.resume();
                setPaused(false);
              } else {
                rec.current?.pause();
                setPaused(true);
              }
            }}
            className="flex-1 cursor-pointer rounded-xl bg-surface py-2.5 text-sm font-semibold hover:bg-line"
          >
            {paused ? s.qa.resume : s.qa.pause}
          </button>
          <button
            type="button"
            onClick={() => rec.current?.stop()}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-coral-btn py-2.5 text-sm font-semibold text-white hover:bg-coral-btn-hover"
          >
            <Square size={12} fill="currentColor" />
            {s.qa.stop}
          </button>
        </div>
      </div>
    );
  }
  if (value.url) {
    return (
      <div className="mb-3.5 flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? s.pause : s.play}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-coral text-white"
        >
          {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <div className="flex flex-1 items-center gap-[3px]" aria-hidden>
          {WAVEFORM.map((h, i) => (
            <span key={i} className="w-[3px] rounded-full bg-dim" style={{ height: h }} />
          ))}
        </div>
        <span className="font-mono text-sm text-dim">{mmss(value.sec)}</span>
        <button
          type="button"
          onClick={() => {
            audio.current?.pause();
            audio.current = null;
            setPlaying(false);
            onChange({ url: null, sec: 0 });
          }}
          aria-label={s.qa.discardRecording}
          className="cursor-pointer p-1 text-faint hover:text-coral"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }
  return (
    <div className="mb-3.5 flex flex-col gap-1.5">
      <button type="button" onClick={start} className="flex h-12 cursor-pointer items-center gap-2.5 rounded-2xl bg-surface-2 px-3.5 text-sm font-semibold hover:bg-line">
        <Mic size={17} className="text-coral" />
        {s.qa.tapToRecord}
      </button>
      {state === 'error' && <span className="text-xs text-coral">{s.micError}</span>}
    </div>
  );
}

// ─── Hoja de Quick Add / detalle ─────────────────────────────────────────────
// Fiel al diseño real de `QuickAddSheet`/`ItemDetailSheet` de la app: switch
// de tipo con thumb deslizante, caja de título con dictado, UNA sola tarjeta
// de configuración con filas divididas (no varias cajas sueltas), acordeones
// para Categoría/Prioridad/presets, y pickers de rueda para hora/duración y
// un calendario de mes para el día. La "X" solo cierra — nunca borra (borrar
// un ítem existente es deslizar la fila en la lista, no un botón acá).
export function QuickAddSheet({
  s,
  lang,
  todayKey,
  defaultDate,
  editing,
  prefill,
  onSave,
  onClose,
}: {
  s: DemoStrings;
  lang: Language;
  todayKey: string;
  defaultDate: string;
  editing: DemoItem | null;
  prefill: Prefill | null;
  onSave: (item: DemoItem) => void;
  onClose: () => void;
}) {
  const base = editing ?? prefill ?? {};
  const [type, setType] = useState<ItemType>(base.type ?? 'task');
  const [title, setTitle] = useState(base.title ?? '');
  const [date, setDate] = useState(base.date ?? defaultDate);
  const [time, setTime] = useState<number | null>(base.time ?? null);
  const [priority, setPriority] = useState<PriorityLevel>(base.priority ?? 'none');
  const [category, setCategory] = useState<CategoryId | null>(base.category ?? null);
  const [link, setLink] = useState(editing?.link ?? '');
  const [repeat, setRepeat] = useState<RepeatOption>(editing?.repeat ?? 'Never');
  const [duration, setDuration] = useState(editing?.durationMin ?? 60);
  const [earlyAlert, setEarlyAlert] = useState<EarlyAlert>(editing?.earlyAlert ?? '10 min before');
  const [body, setBody] = useState(editing?.body ?? '');
  const [audio, setAudio] = useState({ url: editing?.audioUrl ?? null, sec: editing?.durationSec ?? 0 });
  const [schedule, setSchedule] = useState<HabitSchedule>(editing?.schedule ?? 'Every day');
  const [preferredTime, setPreferredTime] = useState<HabitPreferredTime>(editing?.preferredTime ?? 'Anytime');
  const [healthMetric, setHealthMetric] = useState<string | null>(editing?.healthMetric ?? null);
  const [healthTarget, setHealthTarget] = useState<number | null>(editing?.healthMetricTarget ?? null);

  const [timePicker, setTimePicker] = useState<null | 'reminder' | 'starts'>(null);
  const [datePicker, setDatePicker] = useState(false);
  const [durationPicker, setDurationPicker] = useState(false);

  const dictation = useTitleDictation(lang, setTitle);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const needsAudio = type === 'voiceMemo' && !audio.url;
  const canSave = title.trim().length > 0 && !needsAudio;
  const eventStart = time ?? DEFAULT_EVENT_START;

  const save = () => {
    if (!canSave) return;
    onSave({
      id: editing?.id ?? `item-${Date.now()}`,
      type,
      title: title.trim(),
      date: type === 'habit' && editing?.type === 'habit' ? editing.date : date,
      time: type === 'habit' ? null : type === 'event' ? eventStart : time,
      priority,
      category,
      done: editing?.type === type ? editing.done : false,
      link: type === 'task' || type === 'event' ? link.trim() || undefined : undefined,
      repeat: type === 'task' ? repeat : undefined,
      durationMin: type === 'event' ? duration : undefined,
      earlyAlert: type === 'event' ? earlyAlert : undefined,
      schedule: type === 'habit' ? schedule : undefined,
      preferredTime: type === 'habit' ? preferredTime : undefined,
      healthMetric: type === 'habit' ? healthMetric : undefined,
      healthMetricTarget: type === 'habit' ? healthTarget : undefined,
      health: type === 'habit' ? healthMetric !== null : editing?.health,
      completed: type === 'habit' ? (editing?.completed ?? []) : undefined,
      streakBase: editing?.streakBase,
      body: type === 'note' ? body : undefined,
      audioUrl: type === 'voiceMemo' ? audio.url : undefined,
      durationSec: type === 'voiceMemo' ? audio.sec || editing?.durationSec : undefined,
    });
  };

  const timeValue = (m: number | null) => (m === null ? s.off : m === -1 ? s.qa.anyTime : clock12(m).label);
  const repeatLabels = labelsFor(lang, REPEAT_OPTIONS);
  const earlyAlertLabels: Record<string, string> = { Off: s.off, ...labelsFor(lang, EARLY_ALERT_OPTIONS.filter((o) => o !== 'Off')) };
  const preferredLabels: Record<string, string> = { Anytime: s.qa.anyTime, ...labelsFor(lang, HABIT_PREFERRED_TIMES.filter((o) => o !== 'Anytime')) };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/50 text-left" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? s.saveEdit[type] : s.newTitle[type]}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92%] animate-row-in flex-col rounded-t-[32px] border-t border-line bg-surface px-5 pt-3 pb-5"
      >
        <div className="mx-auto mb-1 h-1 w-9 shrink-0 rounded-full bg-[#4a4a50]" />
        <div className="mt-3 mb-5 flex shrink-0 items-center justify-between">
          <span className="text-2xl font-extrabold">{editing ? s.types[type] : s.newTitle[type]}</span>
          <button type="button" onClick={onClose} aria-label={s.close} className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-dim hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <TypeTabs s={s} value={type} onChange={setType} />

        <div className="min-h-0 flex-1 overflow-y-auto pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative mb-5 min-h-[76px] rounded-2xl border border-line bg-bg p-[18px] pb-10 shadow-[0_3px_10px_rgba(0,0,0,0.15)]">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder={dictation.listening ? s.listening : s.qa.placeholder[type]}
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent pr-9 text-base font-medium text-ink placeholder:text-dim focus:outline-none"
            />
            {dictation.supported && (
              <button
                type="button"
                onClick={dictation.toggle}
                aria-label={s.qa.dictate}
                aria-pressed={dictation.listening}
                className={`absolute right-3 bottom-3 flex size-7 cursor-pointer items-center justify-center rounded-full ${
                  dictation.listening ? 'bg-coral text-white' : 'bg-surface-2 text-dim'
                }`}
              >
                <Mic size={14} />
              </button>
            )}
          </div>

          {type === 'note' && (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={s.qa.notePlaceholderBody}
              rows={6}
              className="mb-5 min-h-[180px] w-full resize-none rounded-2xl border border-line bg-bg p-4 text-[15px] text-ink placeholder:text-dim focus:outline-none"
            />
          )}

          <div className="mb-6 rounded-3xl border border-line bg-bg px-4 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
            <FieldRow icon={CalendarDays} label={s.qa.fieldDay} value={dayTitle(s, date, todayKey)} onPress={() => setDatePicker(true)} />

            {type === 'task' && (
              <>
                <FieldRow icon={Bell} label={s.qa.fieldRemindMe} value={timeValue(time)} onPress={() => setTimePicker('reminder')} onClear={time !== null ? () => setTime(null) : undefined} />
                <PresetAccordion icon={RepeatIcon} label={s.qa.fieldRepeat} options={REPEAT_OPTIONS} value={repeat} labels={repeatLabels} onChange={(v) => setRepeat(v as RepeatOption)} />
                <LinkFieldRow s={s} value={link} onChange={setLink} />
              </>
            )}

            {type === 'event' && (
              <>
                <FieldRow icon={Clock} label={s.qa.fieldStarts} value={clock12(eventStart).label} onPress={() => setTimePicker('starts')} />
                <FieldRow icon={Clock} label={s.qa.fieldDuration} value={s.durations.find(([m]) => m === duration)?.[1] ?? `${duration} min`} onPress={() => setDurationPicker(true)} />
                <PresetAccordion
                  icon={Bell}
                  label={s.qa.fieldEarlyAlert}
                  options={EARLY_ALERT_OPTIONS}
                  value={earlyAlert}
                  labels={earlyAlertLabels}
                  onChange={(v) => setEarlyAlert(v as EarlyAlert)}
                />
                <LinkFieldRow s={s} value={link} onChange={setLink} />
              </>
            )}

            {type === 'voiceMemo' && (
              <>
                <div className="pt-3.5">
                  <VoiceRecordField s={s} value={audio} onChange={setAudio} />
                </div>
                <FieldRow icon={Bell} label={s.qa.fieldRemindMe} value={timeValue(time)} onPress={() => setTimePicker('reminder')} onClear={time !== null ? () => setTime(null) : undefined} />
              </>
            )}

            {type === 'note' && (
              <FieldRow icon={Bell} label={s.qa.fieldRemindMe} value={timeValue(time)} onPress={() => setTimePicker('reminder')} onClear={time !== null ? () => setTime(null) : undefined} />
            )}

            {type === 'habit' && (
              <>
                <PresetAccordion icon={RepeatIcon} label={s.qa.fieldSchedule} options={HABIT_SCHEDULES} value={schedule} labels={s.schedules} onChange={(v) => setSchedule(v as HabitSchedule)} />
                <PresetAccordion
                  icon={Clock}
                  label={s.qa.fieldPreferredTime}
                  options={HABIT_PREFERRED_TIMES}
                  value={preferredTime}
                  labels={preferredLabels}
                  onChange={(v) => setPreferredTime(v as HabitPreferredTime)}
                />
                <HealthAutoTrackFieldRow
                  s={s}
                  metricId={healthMetric}
                  target={healthTarget}
                  onChange={(id, target) => {
                    setHealthMetric(id);
                    setHealthTarget(target);
                  }}
                />
              </>
            )}

            <CategoryAccordion s={s} value={category} onChange={setCategory} showBorder />
            <PriorityAccordion s={s} value={priority} onChange={setPriority} />
          </div>

          {needsAudio && <span className="mb-2 block text-center text-xs text-faint">{s.recordFirst}</span>}

          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="mb-1.5 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-[20px] bg-coral text-[17px] font-bold text-white hover:brightness-95 disabled:cursor-default disabled:opacity-50"
          >
            <CheckIcon size={20} />
            {editing ? s.saveEdit[type] : s.saveNew[type]}
          </button>
        </div>
      </div>

      {timePicker && (
        <TimePickerModal
          s={s}
          minutes={time !== null && time !== -1 ? time : 9 * 60}
          allowAnyTime={timePicker === 'reminder'}
          onCancel={() => setTimePicker(null)}
          onConfirm={(m) => {
            setTime(m);
            setTimePicker(null);
          }}
          onSelectAnyTime={
            timePicker === 'reminder'
              ? () => {
                  setTime(-1);
                  setTimePicker(null);
                }
              : undefined
          }
        />
      )}
      {datePicker && (
        <DatePickerModal
          s={s}
          selectedKey={date}
          todayKey={todayKey}
          onCancel={() => setDatePicker(false)}
          onSelect={(k) => {
            setDate(k);
            setDatePicker(false);
          }}
        />
      )}
      {durationPicker && (
        <DurationPickerModal
          s={s}
          minutes={duration}
          onCancel={() => setDurationPicker(false)}
          onConfirm={(m) => {
            setDuration(m);
            setDurationPicker(false);
          }}
        />
      )}
    </div>
  );
}
