import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import type { TodayWidgetData } from './todayWidgetData';
import { widgetIconSvgFor, WIDGET_SUN_ICON_SVG } from './androidIcons';
import { widgetContentScale } from './widgetScale';

// Paleta fija (dark), no depende de `theme/tokens.ts` a propósito — el
// widget se dibuja fuera del árbol de React de la app (headless task o
// llamada directa desde `requestWidgetUpdate`), sin `ThemeProvider` ni
// acceso al `accent` elegido en Settings. Coincide con los tokens dark base
// (`darkBase`/coral) para que combine visualmente con el resto de la app.
// Ver CLAUDE.md → "Widgets de pantalla de inicio".
const BG = '#1C1C1E';
const TEXT = '#FFFFFF';
const TEXT_DIM = '#8E8E93';
const ACCENT = '#FF4B66';
const PILL_BG = '#2A2A2C';
const BORDER = '#2C2C2E';

interface TodayAndroidWidgetProps {
  data: TodayWidgetData;
  emptyLabel: string;
  todayLabel: string;
  width?: number;
  height?: number;
}

/** Widget "Hoy" — tocar el fondo/título abre la app (`clickAction=
 * "OPEN_APP"` en la raíz), pero el checkbox de cada TASK es interactivo de
 * verdad: márcala hecha ahí mismo, sin abrir nada (`clickAction=
 * "TOGGLE_TASK"`, manejado en `registerWidgetTask.ts` → `WIDGET_CLICK`,
 * ver `widgetActions.ts`) — pedido explícito del usuario, un widget que
 * solo abre la app "no tiene sentido" si eso es todo lo que hace. El resto
 * de tipos (event/note/voiceMemo/habit/moment) no tienen acción propia
 * todavía, tocarlos cae al comportamiento de fondo (abrir la app). Sin
 * pantalla de configuración (ver spec Free § "Un widget de pantalla de
 * inicio"), pero SÍ se adapta al tamaño real que le dio el launcher
 * (`widgetContentScale`) — tipografía, íconos y gaps escalan junto con la
 * cantidad de filas (`androidWidgetTree.ts` → `pickVisibleItemCount`, usa
 * el mismo factor), para que un widget grande se vea con contenido cómodo
 * y prolijo en vez de texto chico perdido en una caja grande. */
export function TodayAndroidWidget({ data, emptyLabel, todayLabel, width, height }: TodayAndroidWidgetProps) {
  const scale = widgetContentScale(width, height);
  const headerFontSize = Math.round(17 * scale);
  const pillFontSize = Math.round(12 * scale);
  const iconSize = Math.round(16 * scale);
  const timeFontSize = Math.round(11 * scale);
  const timeWidth = Math.round(56 * scale);
  const titleFontSize = Math.round(14 * scale);
  const rowGap = Math.round(8 * scale);
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
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        <TextWidget text={todayLabel} style={{ fontSize: headerFontSize, fontWeight: '800', color: TEXT }} />
        <FlexWidget style={{ backgroundColor: PILL_BG, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 }}>
          <TextWidget
            text={`${data.doneCount}/${data.totalCount}`}
            style={{ fontSize: pillFontSize, fontWeight: '700', color: TEXT_DIM }}
          />
        </FlexWidget>
      </FlexWidget>
      {data.items.length === 0 ? (
        <FlexWidget
          style={{
            flexDirection: 'column',
            width: 'match_parent',
            height: 'match_parent',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            flexGap: 6,
          }}
        >
          <SvgWidget svg={WIDGET_SUN_ICON_SVG} style={{ width: 22, height: 22 }} />
          <TextWidget text={emptyLabel} style={{ fontSize: 13, color: TEXT_DIM }} />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', flexGap: listGap }}>
          {data.items.map((item) => (
            <FlexWidget
              key={item.id}
              style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', flexGap: rowGap }}
            >
              {item.type === 'task' ? (
                <FlexWidget
                  clickAction="TOGGLE_TASK"
                  clickActionData={{ id: item.id }}
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
                  <SvgWidget svg={widgetIconSvgFor(item.type)} style={{ width: iconSize, height: iconSize }} />
                </FlexWidget>
              ) : (
                <SvgWidget svg={widgetIconSvgFor(item.type)} style={{ width: iconSize, height: iconSize }} />
              )}
              <TextWidget
                text={item.timeLabel}
                style={{ fontSize: timeFontSize, fontWeight: '600', color: ACCENT, width: timeWidth }}
              />
              {/* `TextWidget` no tiene prop `flex` (solo `FlexWidget` la
                  soporta) — envolverlo en un `FlexWidget` con `flex: 1` le da
                  el resto exacto de la fila, sea cual sea el tamaño real del
                  widget. */}
              <FlexWidget style={{ flex: 1 }}>
                <TextWidget
                  text={item.title}
                  truncate="END"
                  maxLines={1}
                  style={{ fontSize: titleFontSize, fontWeight: '500', color: TEXT, width: 'match_parent' }}
                />
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
