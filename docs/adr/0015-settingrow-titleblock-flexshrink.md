# 0015 — `SettingRow`: `titleBlock` necesita `flexShrink: 1`

**Fecha:** histórica (sesión anterior) — bug real visto en dispositivo.

## Problema

Sin `flexShrink` en la columna de título+subtítulo, esa columna ignora el ancho disponible y se
dibuja a su ancho de contenido completo, superponiéndose con `right` (p. ej. el switch de "Hábitos
Cool", con un subtítulo largo de 2 líneas) en vez de ajustar dónde hace wrap.

## Decisión

`titleBlock` en `src/components/settings/SettingRow.tsx` siempre lleva `flexShrink: 1`. No quitarlo.
