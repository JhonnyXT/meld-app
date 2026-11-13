# 0020 — Los widgets "Hoy"/"Hábitos" calculan filas visibles según el tamaño real

**Fecha:** histórica (sesión anterior) — bug real reportado por el usuario (captura del widget
con espacio de sobra abajo).

## Problema

Mostrar siempre un número fijo de filas deja un hueco vacío si el usuario agranda el widget, o
corta una fila a la mitad si lo achica — Android no tiene tamaños fijos como iOS
(Small/Medium/Large): el usuario arrastra el widget a cualquier tamaño dentro de un rango.

## Decisión

`pickVisibleItemCount` (`src/widget/androidWidgetTree.ts`) calcula cuántas filas entran a partir
del alto real que le dio el launcher (`widgetInfo.height`, en dp), usando el mismo factor de
escala de `widgetContentScale` para que el alto de fila usado en el cálculo coincida con el alto
real que se va a dibujar.
