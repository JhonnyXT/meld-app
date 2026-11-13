# 0022 — Kotlin 2.2.20 fijado explícito por un conflicto con `@react-native-firebase/auth`

**Fecha:** histórica (sesión anterior) — bug real que bloqueaba el build nativo.

## Problema

El build fallaba con "Module was compiled with an incompatible version of Kotlin" (metadata 2.4.0
vs. 2.1.0 esperado) en el AAR de `firebase-auth` de `@react-native-firebase/auth` 27.x. El default
de Expo (Kotlin 2.0.21, vía `expo-build-properties`) no compila contra Kotlin 2.2.20, que ya
aparecía como constraint resuelto en el árbol de dependencias.

## Decisión

Se resolvió bajando `@react-native-firebase/auth` a 26.0.0 (usa `firebase-bom` 34.15.0 en vez de
35.0.2 — ver `package.json`). La versión de Kotlin 2.2.20 se deja fijada igual en
`app.config.ts` → `expo-build-properties` → `android.kotlinVersion`, porque ya la pedía el resto
del árbol de dependencias independientemente de ese fix.
