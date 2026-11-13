# 0003 — El heatmap de ejemplo usa una semilla pseudoaleatoria fija

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`Habits.tsx` (sección "Hábitos" de la portada) dibuja un heatmap de 36 semanas con datos de
ejemplo, generados en el propio componente de servidor.

## Problema que evita

Next.js renderiza este componente tanto en el servidor como en el cliente (hidratación). Si los
datos de ejemplo salieran de `Math.random()`, el HTML del servidor y el del cliente no
coincidirían, y React tiraría un error de hidratación (o un flash de contenido distinto).

## Decisión

`sampleYear()` usa un generador congruencial lineal con semilla fija (`seed = 11`), así el
resultado es siempre el mismo en servidor y cliente. No reemplazar por `Math.random()` ni por
cualquier fuente de aleatoriedad real.

Código: `landing/src/components/sections/Habits.tsx`.
