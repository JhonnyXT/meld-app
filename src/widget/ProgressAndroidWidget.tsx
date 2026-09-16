import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { widgetContentScale } from './widgetScale';

const BG = '#1C1C1E';
const TEXT = '#FFFFFF';
const TEXT_DIM = '#8E8E93';
const ACCENT = '#FF4B66';

interface ProgressAndroidWidgetProps {
  doneCount: number;
  totalCount: number;
  todayLabel: string;
  subLabel: string;
  width?: number;
  height?: number;
}

/** Widget "Progreso del día" — tamaño fijo desde la config
 * (`resizeMode: 'none'`), solo el conteo grande de hoy (mismo
 * `doneCount`/`totalCount` que ya calcula `todayWidgetData.ts` para el
 * header del widget "Hoy" — ver la misma simplificación conocida ahí: no
 * inyecta ocurrencias recurrentes de hábitos). `widgetContentScale` agranda
 * la fracción según el tamaño real que le dio el launcher del usuario
 * (mismo bug/fix que `QuickAddAndroidWidget.tsx`). Tocar abre la app.
 * Diseñado primero en `designs/trove-splash.pen` → "Widget - Progreso del
 * día". */
export function ProgressAndroidWidget({
  doneCount,
  totalCount,
  todayLabel,
  subLabel,
  width,
  height,
}: ProgressAndroidWidgetProps) {
  const scale = widgetContentScale(width, height);
  const fractionSize = Math.round(34 * scale);
  const subLabelSize = Math.round(12 * Math.sqrt(scale));

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: BG,
        borderRadius: 20,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <TextWidget text={todayLabel} style={{ fontSize: 15, fontWeight: '700', color: TEXT }} />
      <FlexWidget
        style={{
          flex: 1,
          width: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flexGap: 2,
        }}
      >
        <TextWidget text={`${doneCount}/${totalCount}`} style={{ fontSize: fractionSize, fontWeight: '800', color: ACCENT }} />
        <TextWidget text={subLabel} style={{ fontSize: subLabelSize, color: TEXT_DIM }} />
      </FlexWidget>
    </FlexWidget>
  );
}
