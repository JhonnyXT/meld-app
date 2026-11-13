# 0012 — `WheelColumn` confirma el valor con un `setTimeout`, no con `scrollend`

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`WheelColumn.tsx` (equivalente web del wheel-picker nativo de la app) necesita saber cuándo el
usuario dejó de hacer scroll para confirmar el valor centrado.

## Decisión

Usa `onScroll` + un `setTimeout` de 110ms que se reinicia en cada evento de scroll, en vez del
evento nativo `scrollend`. Al momento de escribir esto, `scrollend` no tenía soporte fiable en
todos los navegadores relevantes — simplificar a ese evento nativo podría dejar de confirmar el
valor en algunos navegadores.

Código: `landing/src/demo/quickAdd/WheelColumn.tsx`.
