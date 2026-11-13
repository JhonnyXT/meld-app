# 0021 — Peculiaridades de layout de `react-native-android-widget`

**Fecha:** histórica (sesión anterior).

## Contexto

`FlexWidget`/`TextWidget` de `react-native-android-widget` no se comportan exactamente como
`View`/`Text` de React Native.

## Decisiones

- `FlexWidget` apila en columna por defecto (como `View`). Sin `flexDirection: 'row'` explícito,
  `justifyContent`/`alignItems` actúan sobre el eje vertical, no el horizontal — el círculo del FAB
  en `QuickAddAndroidWidget.tsx` quedaba pegado a la izquierda en vez de centrado hasta agregar
  `flexDirection: 'row'` al contenedor.
- `TextWidget` no tiene prop `flex`. Para que un texto tome el resto de una fila (p. ej. el título
  en `TodayAndroidWidget.tsx`/`HabitsAndroidWidget.tsx`), hay que envolverlo en un `FlexWidget` con
  `flex: 1` — el truncado de títulos largos que resulta de esto es el comportamiento esperado, no
  un bug a corregir.

Código: `src/widget/QuickAddAndroidWidget.tsx`, `src/widget/TodayAndroidWidget.tsx`,
`src/widget/HabitsAndroidWidget.tsx`.
