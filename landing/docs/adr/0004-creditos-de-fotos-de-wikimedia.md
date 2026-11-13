# 0004 — Las fotos de la sección Momentos exigen crédito de licencia

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`Moments.tsx` (sección "Momentos" de la portada) usa 4 fotos de Wikimedia Commons, descargadas y
recortadas a 4:5 en `landing/public/img/`.

## Decisión

Dos de las fotos (Santorini de Giles Laurent, Kyoto de Basile Morin) están bajo licencia
**CC BY-SA 4.0**, que exige dar crédito al autor — por eso existe el arreglo `CREDITS` con
autor/licencia/link, renderizado debajo del abanico de fotos. Las otras dos (Moraine Lake,
Fitz Roy) son de dominio público, sin licencia que exigir, pero se mantiene el crédito al autor
igual por buena práctica.

**Si se reemplaza una foto de `CARDS`, hay que actualizar su entrada correspondiente en
`CREDITS`** (mismo índice) — quitar el crédito de una foto con licencia CC BY-SA sin reemplazarlo
incumple los términos de esa licencia.

Código: `landing/src/components/sections/Moments.tsx`.
