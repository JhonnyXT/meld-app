# 0014 — `ConfirmDialog`: `btnText` necesita `textAlign: 'center'` explícito

**Fecha:** histórica (sesión anterior) — bug real reportado por el usuario, 2026-11-06.

## Problema

Un label largo ("Mantener en el teléfono"/"Borrar de este teléfono") envuelve a 2 líneas en un
botón angosto. Sin `textAlign: 'center'` explícito en el estilo del texto, la segunda línea queda
pegada a la izquierda en vez de centrada bajo la primera.

## Decisión

`btnText` en `src/components/ConfirmDialog.tsx` siempre lleva `textAlign: 'center'`. No quitarlo
aunque los labels en uso hoy sean cortos — el componente es genérico y cualquier label futuro más
largo reproduce el bug si se omite.
