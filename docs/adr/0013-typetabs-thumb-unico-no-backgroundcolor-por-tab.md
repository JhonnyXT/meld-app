# 0013 — `TypeTabs`: un solo "thumb" animado, no `backgroundColor` por tab

**Fecha:** histórica (sesión anterior) — bug real reportado por el usuario.

## Contexto

`TypeTabs` (selector de tipo en Quick Add/`ItemDetailSheet`) se selecciona por arrastre continuo
sobre el track completo, recalculando el índice activo en cada frame del gesto.

## Problema observado

Pintar la selección cambiando el `backgroundColor` de cada tab en cada render se veía "brusco"
durante el arrastre: el pill activo perdía las esquinas redondeadas un frame sí y otro no, por el
recálculo de layout/estilo en cada índice.

## Decisión

Un único "Thumb" (`Animated.View` absoluto, `pointerEvents="none"`) se desliza con `withTiming` a
la posición del índice activo — mismo pill, misma forma, solo se mueve. Los íconos van en una capa
aparte encima, sin fondo propio, solo cambian de color según estén debajo del thumb o no.

Código: `src/components/quickAdd/TypeTabs.tsx`.
