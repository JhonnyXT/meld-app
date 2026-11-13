# 0012 — `CategoryChips`: el divisor va en un solo lugar a la vez

**Fecha:** histórica (sesión anterior) — bug real reportado por el usuario el mismo día que se
agregó el acordeón.

## Contexto

`CategoryChips` es un acordeón colapsado por default (header + chips que se expanden). El header
colapsado y el pie de los chips expandidos pueden llevar un divisor (`showBorder`) para separar de
la sección siguiente (Prioridad).

## Problema observado

El divisor se dibujaba en el header Y en el pie de los chips al mismo tiempo, duplicando el
espacio visual antes de Prioridad.

## Decisión

El divisor va en el header SOLO cuando está colapsado, y se mueve al pie de los chips SOLO cuando
está expandido — nunca en los dos lugares a la vez.

Código: `src/components/quickAdd/CategoryChips.tsx`.
