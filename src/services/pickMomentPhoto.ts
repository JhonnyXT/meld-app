import * as ImagePicker from 'expo-image-picker';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { toDateKey } from '@/domain/date';
import { getISOWeek } from '@/domain/week';
import { newId } from '@/domain/id';
import type { Moment } from '@/domain/dayItem';

export async function pickMomentPhotoForToday(): Promise<Moment | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const now = new Date();
  const iso = now.toISOString();
  const moment: Moment = {
    id: newId(),
    createdAt: iso,
    updatedAt: iso,
    date: toDateKey(now),
    title: `Momento ${toDateKey(now)}`,
    category: null,
    categoryColor: null,
    reminderAt: null,
    status: 'scheduled',
    priority: 'none',
    type: 'moment',
    mediaUri: result.assets[0].uri,
    weekOfYear: getISOWeek(now),
  };

  await dayItemRepository.upsert(moment);
  return moment;
}
