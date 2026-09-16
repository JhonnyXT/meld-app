import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import type { HabitsWidgetData } from './habitsWidgetData';
import { WIDGET_REPEAT_ICON_SVG } from './androidIcons';
import { widgetContentScale } from './widgetScale';

const BG = '#1C1C1E';
const TEXT = '#FFFFFF';
const TEXT_DIM = '#8E8E93';
const ACCENT = '#FF4B66';
const PILL_BG = '#2A2A2C';
const BORDER = '#2C2C2E';

interface HabitsAndroidWidgetProps {
  data: HabitsWidgetData;
  emptyLabel: string;
  habitsLabel: string;
  width?: number;
  height?: number;
}

/** Widget "Hábitos" — lista de solo lectura de los hábitos programados HOY
 * con su progreso semanal ("x/y") y racha (🔥N), separado de tareas/eventos
 * (ver `habitsWidgetData.ts`). Mismo patrón de tamaño adaptable que el
 * widget "Hoy": `androidWidgetTree.ts` → `pickVisibleItemCount` decide
 * cuántas filas entran, y `widgetContentScale` (mismo factor) agranda
 * tipografía/íconos/gaps según el tamaño real que le dio el launcher —
 * ambos van de la mano (filas más grandes → entran menos). El ícono de
 * cada fila es interactivo de verdad: márcala hecha hoy ahí mismo, sin
 * abrir la app (`clickAction="TOGGLE_HABIT"`, ver `widgetActions.ts` y
 * `registerWidgetTask.ts` → `WIDGET_CLICK`) — mismo pedido explícito que
 * `TodayAndroidWidget.tsx`. Diseñado primero en `designs/trove-splash.pen`
 * → "Widget - Hábitos". */
export function HabitsAndroidWidget({ data, emptyLabel, habitsLabel, width, height }: HabitsAndroidWidgetProps) {
  const scale = widgetContentScale(width, height);
  const headerFontSize = Math.round(17 * scale);
  const pillFontSize = Math.round(12 * scale);
  const iconSize = Math.round(16 * scale);
  const titleFontSize = Math.round(14 * scale);
  const streakFontSize = Math.round(11 * scale);
  const progressFontSize = Math.round(12 * scale);
  const rowGap = Math.round(8 * scale);
  const trailGap = Math.round(6 * scale);
  const listGap = Math.round(9 * scale);
  const headerListGap = Math.round(12 * scale);

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
        flexGap: headerListGap,
      }}
    >
      <FlexWidget
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}
      >
        <TextWidget text={habitsLabel} style={{ fontSize: headerFontSize, fontWeight: '800', color: TEXT }} />
        <FlexWidget style={{ backgroundColor: PILL_BG, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 }}>
          <TextWidget
            text={`${data.doneCount}/${data.totalCount}`}
            style={{ fontSize: pillFontSize, fontWeight: '700', color: TEXT_DIM }}
          />
        </FlexWidget>
      </FlexWidget>
      {data.rows.length === 0 ? (
        <FlexWidget
          style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}
        >
          <TextWidget text={emptyLabel} style={{ fontSize: 13, color: TEXT_DIM }} />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', flexGap: listGap }}>
          {data.rows.map((row) => (
            <FlexWidget
              key={row.id}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent' }}
            >
              {/* `flex: 1` en el contenedor (no en el `TextWidget`, que no
                  soporta esa prop) — es el patrón correcto de Android para
                  "tomar el resto de la fila", no un fix de un bug puntual
                  (el truncado de títulos largos es esperado, ver CLAUDE.md
                  → "Widget de pantalla de inicio"). */}
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: rowGap, flex: 1 }}>
                <FlexWidget
                  clickAction="TOGGLE_HABIT"
                  clickActionData={{ id: row.id }}
                  style={{
                    width: iconSize + 12,
                    height: iconSize + 12,
                    borderRadius: 8,
                    borderWidth: 1.5,
                    borderColor: BORDER,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <SvgWidget svg={WIDGET_REPEAT_ICON_SVG} style={{ width: iconSize, height: iconSize }} />
                </FlexWidget>
                <FlexWidget style={{ flex: 1 }}>
                  <TextWidget
                    text={row.title}
                    truncate="END"
                    maxLines={1}
                    style={{ fontSize: titleFontSize, fontWeight: '500', color: TEXT, width: 'match_parent' }}
                  />
                </FlexWidget>
              </FlexWidget>
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: trailGap }}>
                <TextWidget text={`🔥${row.streak}`} style={{ fontSize: streakFontSize, fontWeight: '700', color: ACCENT }} />
                <TextWidget text={row.progress} style={{ fontSize: progressFontSize, fontWeight: '600', color: TEXT_DIM }} />
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
