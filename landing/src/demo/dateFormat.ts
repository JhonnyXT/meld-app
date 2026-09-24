// Formato de fecha compartido por `DemoPhone` y `QuickAddSheet` — en un
// archivo propio (en vez de vivir dentro de `DemoPhone.tsx`) para que
// `QuickAddSheet.tsx` pueda importarlo sin crear un import circular entre
// los dos (`DemoPhone` renderiza `QuickAddSheet`).
import { fromDateKey, shiftKey } from './model';
import type { DemoStrings } from './strings';

export function dayTitle(s: DemoStrings, key: string, todayKey: string): string {
  if (key === todayKey) return s.today;
  if (key === shiftKey(todayKey, 1)) return s.tomorrow;
  if (key === shiftKey(todayKey, -1)) return s.yesterday;
  const d = fromDateKey(key);
  return `${s.weekdays[d.getDay()]} ${d.getDate()}`;
}

export function dayLong(s: DemoStrings, key: string): string {
  const d = fromDateKey(key);
  return `${s.weekdays[d.getDay()]} ${d.getDate()} ${s.months[d.getMonth()]}`;
}
