import * as ImagePicker from 'expo-image-picker';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { toDateKey } from '@/domain/date';
import type { WeekInfo } from '@/domain/week';
import type { Moment } from '@/domain/dayItem';

/**
 * Abre el picker de fotos y guarda el resultado como el Moment de esa semana.
 * MVP: se guarda la URI que entrega el picker directamente (no se copia a
 * almacenamiento propio todavía).
 */
export async function pickMomentPhotoForWeek(week: WeekInfo): Promise<Moment | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const now = new Date().toISOString();
  const moment: Moment = {
    id: `moment-${week.year}-${week.weekNumber}`,
    createdAt: now,
    updatedAt: now,
    date: toDateKey(week.start),
    title: `Week ${week.weekNumber}`,
    category: null,
    categoryColor: null,
    reminderAt: null,
    status: 'scheduled',
    priority: 'none',
    type: 'moment',
    mediaUri: result.assets[0].uri,
    weekOfYear: week.weekNumber,
  };

  await dayItemRepository.upsert(moment);
  return moment;
}
