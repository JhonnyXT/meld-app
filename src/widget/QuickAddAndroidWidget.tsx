import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import * as Linking from 'expo-linking';
import { WIDGET_PLUS_ICON_SVG } from './androidIcons';
import { widgetContentScale } from './widgetScale';

const BG = '#1C1C1E';
const TEXT = '#FFFFFF';
const CORAL = '#FF4B66';

interface QuickAddAndroidWidgetProps {
  label: string;
  width?: number;
  height?: number;
}

/** Widget "Agregar rápido" — sin datos (no necesita refrescarse por cambios
 * en la DB), pero SÍ de tamaño fijo desde la config (`resizeMode: 'none'`
 * en `app.config.ts`) — lo que NO es fijo es cuánto espacio real le da el
 * launcher del usuario a ese tamaño "chico" (cada launcher usa su propia
 * grilla; Samsung One UI, por ejemplo, da celdas bastante más grandes que
 * el mock de referencia). `widgetContentScale` agranda el círculo del FAB
 * para que no quede perdido en una caja más grande de lo esperado — bug
 * real reportado por el usuario. Tocar el círculo coral arma una deep link
 * con `Linking.createURL` (resuelve al scheme real del variant, nunca
 * hardcodeado) que `app/_layout.tsx` escucha para abrir Quick Add directo,
 * sin pasar por Today. Diseñado primero en `designs/trove-splash.pen` →
 * "Widget - Agregar rápido". */
export function QuickAddAndroidWidget({ label, width, height }: QuickAddAndroidWidgetProps) {
  const scale = widgetContentScale(width, height);
  const fabSize = Math.round(52 * scale);
  const plusSize = Math.round(24 * scale);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: Linking.createURL('/', { queryParams: { openQuickAdd: 'task' } }) }}
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
      <TextWidget text={label} style={{ fontSize: 15, fontWeight: '700', color: TEXT }} />
      {/* `FlexWidget` apila en columna por default (como `View` de RN) — sin
          `flexDirection: 'row'` acá, `justifyContent`/`alignItems` actúan
          sobre el eje vertical, no el horizontal, y el círculo terminaba
          pegado a la izquierda en vez de centrado (bug real visto en el
          mock de Pen, mismo error ahí). */}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'center' }}>
        <FlexWidget
          style={{
            width: fabSize,
            height: fabSize,
            backgroundColor: CORAL,
            borderRadius: fabSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <SvgWidget svg={WIDGET_PLUS_ICON_SVG} style={{ width: plusSize, height: plusSize }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
