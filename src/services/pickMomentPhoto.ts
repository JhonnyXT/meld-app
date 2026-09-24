import * as ImagePicker from 'expo-image-picker';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { toDateKey } from '@/domain/date';
import { getISOWeek } from '@/domain/week';
import type { Moment } from '@/domain/dayItem';

/**
 * Abre el picker de fotos y guarda el resultado como un Momento del día de
 * HOY. Se pueden guardar varias fotos por día (id único por foto). MVP: se
 * guarda la URI que entrega el picker directamente (no se copia a
 * almacenamiento propio todavía).
 */
export async function pickMomentPhotoForToday(): Promise<Moment | null> {
  // Sin pedir permiso: en Android abre el Photo Picker del sistema (el usuario
  // elige una foto y solo esa se comparte) — Google Play no permite pedir
  // acceso a toda la galería para esto.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const now = new Date();
  const iso = now.toISOString();
  const moment: Moment = {
    id: `moment-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
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
