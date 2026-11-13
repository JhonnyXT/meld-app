# 0018 — El esqueleto de Today no espera a `syncNow()`

**Fecha:** histórica (sesión anterior) — bug real reportado por el usuario, 2026-11-12, probando
el variant `test` contra Firebase real (no el emulador local).

## Problema

`useFocusEffect` de `TodayScreen` esperaba el ciclo completo de `syncNow()` (traer + subir contra
Firestore) ANTES de ocultar el esqueleto de carga. Contra el emulador local esto es casi
instantáneo y nunca se notaba, pero contra Firebase real la latencia de red de un ciclo completo
—sobre todo con categorías compartidas de por medio— se sentía como "Hoy tarda en cargar".

## Decisión

El esqueleto se oculta apenas termina el `reload()` LOCAL (SQLite). `syncNow()` sigue corriendo en
segundo plano; si trae cambios, otro `reload()` los refleja sin volver a tapar el contenido ya
visible con el esqueleto.

Código: `src/features/today/TodayScreen.tsx` → el `useFocusEffect` que llama `reload()` y
`syncNow()`.
