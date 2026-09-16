import { useCallback, useEffect, useMemo, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { cancelReminderNotification, syncReminderNotification } from '@/services/notifications';
import { getWeekRange } from '@/domain/week';
import { toDateKey, addDays } from '@/domain/date';
import type { DayItem } from '@/domain/dayItem';
import { useUndoStore } from '@/store/undoStore';
import { useSettingsStore } from '@/store/settingsStore';
import { translate } from '@/i18n';

/** Estado + mutaciones de la agenda semanal — separado de la UI para que el
 * selector de días (sticky, arriba) y la lista de secciones (dentro del
 * ScrollView) compartan exactamente los mismos datos y handlers. Los ítems
 * de acá pueden ser de cualquier día de la semana, por eso cada mutación
 * necesita `date` explícito (a diferencia de `dayItemsStore`, que asume un
 * único día seleccionado). */
export function useWeekAgenda(referenceDate: Date) {
  const { start, end } = useMemo(() => getWeekRange(referenceDate), [referenceDate]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const [itemsByDate, setItemsByDate] = useState<Record<string, DayItem[]>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    const startKey = toDateKey(start);
    const endKey = toDateKey(end);
    setLoading(true);
    dayItemRepository.listByDateRange(startKey, endKey).then((items) => {
      const grouped: Record<string, DayItem[]> = {};
      for (const item of items) {
        if (!item.date) continue;
        (grouped[item.date] ??= []).push(item);
      }
      setItemsByDate(grouped);
      setLoading(false);
    });
  }, [start, end]);

  useEffect(() => {
    reload();
  }, [reload]);

  const patchItem = useCallback((updated: DayItem) => {
    if (!updated.date) return;
    const date = updated.date;
    setItemsByDate((prev) => ({
      ...prev,
      [date]: (prev[date] ?? []).map((i) => (i.id === updated.id ? updated : i)),
    }));
  }, []);

  const toggleComplete = useCallback(
    async (id: string, date: string) => {
      const item = itemsByDate[date]?.find((i) => i.id === id);
      if (!item) return;
      const updated: DayItem = { ...item, status: item.status === 'done' ? 'scheduled' : 'done', updatedAt: new Date().toISOString() };
      await dayItemRepository.upsert(updated);
      patchItem(updated);
    },
    [itemsByDate, patchItem],
  );

  const remove = useCallback(
    async (id: string, date: string) => {
      const item = itemsByDate[date]?.find((i) => i.id === id);
      if (!item) return;
      setItemsByDate((prev) => ({ ...prev, [date]: (prev[date] ?? []).filter((i) => i.id !== id) }));
      await dayItemRepository.remove(id);
      await cancelReminderNotification(id);
      useUndoStore.getState().show(translate(useSettingsStore.getState().language, 'itemDeleted'), 'delete-outline', async () => {
        await dayItemRepository.upsert(item);
        await syncReminderNotification(item);
        setItemsByDate((prev) => ({ ...prev, [date]: [...(prev[date] ?? []), item] }));
      });
    },
    [itemsByDate],
  );

  const clearVoiceMemoAudio = useCallback(
    async (id: string, date: string) => {
      const item = itemsByDate[date]?.find((i) => i.id === id);
      if (!item || item.type !== 'voiceMemo') return;
      if (item.audioFileUri) {
        const file = new FileSystem.File(item.audioFileUri);
        if (file.exists) file.delete();
      }
      const updated: DayItem = { ...item, audioFileUri: '', durationSeconds: 0, updatedAt: new Date().toISOString() };
      await dayItemRepository.upsert(updated);
      patchItem(updated);
    },
    [itemsByDate, patchItem],
  );

  return { days, itemsByDate, loading, reload, toggleComplete, remove, clearVoiceMemoAudio };
}
