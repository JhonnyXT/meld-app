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

export function useWeekAgenda(referenceDate: Date) {
  const { start, end } = useMemo(() => getWeekRange(referenceDate), [referenceDate]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const [itemsByDate, setItemsByDate] = useState<Record<string, DayItem[]>>({});
  const [completedByMap, setCompletedByMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    const startKey = toDateKey(start);
    const endKey = toDateKey(end);
    setLoading(true);
    dayItemRepository.listByDateRange(startKey, endKey).then(async (items) => {
      const grouped: Record<string, DayItem[]> = {};
      for (const item of items) {
        if (!item.date) continue;
        (grouped[item.date] ??= []).push(item);
      }
      // ver docs/adr/0017-completedby-map-propio-en-week-agenda.md
      const completedBy = await dayItemRepository.getCompletedByUidMap(items.map((i) => i.id));
      setItemsByDate(grouped);
      setCompletedByMap(completedBy);
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

  return { days, itemsByDate, completedByMap, loading, reload, toggleComplete, remove, clearVoiceMemoAudio };
}
