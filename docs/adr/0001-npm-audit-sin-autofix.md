# 0001 — `npm audit fix --force` no se usa en este proyecto

**Fecha:** 2026-11-12

## Contexto

Auditoría de seguridad (Fase 1 de la limpieza de arquitectura/seguridad, rama
`refactor/arquitectura-seguridad`). `npm audit` reporta 67 vulnerabilidades (1 crítica, 20 altas),
la mayoría en dependencias transitivas de herramientas de desarrollo (`firebase-tools`,
`drizzle-kit`, `@bacons/xcode`) que no se empaquetan en el APK, y algunas en dependencias runtime
reales (`firebase`, `@firebase/firestore`).

## Problema encontrado

`npm audit fix --force` (y lo mismo instalando a mano las versiones que sugiere, como
`firebase-tools@15.36.0`) resuelve el árbol de dependencias de forma incorrecta para este
proyecto: downgradea `@react-native-firebase/app`/`auth`/`firestore` de `^26.0.0` a `^20.1.0` (una
versión vieja, de antes del ajuste cuidadoso que `app.config.ts` ya documenta — conflicto de
versión de Kotlin resuelto bajando de 27.x a 26.0.0) y sube `expo-router` de `~57.0.14` a
`^58.0.31` (un major incompatible con Expo SDK 57, que todo el proyecto usa). El resultado compila
en apariencia porque `node_modules` puede quedar en un estado intermedio, pero `npx tsc --noEmit`
revela cientos de errores reales de tipos rotos en todo `src/sync/`.

Probado y confirmado dos veces (una con la instalación manual, otra con `npm audit fix --force`
solo) — ambas rompen las mismas versiones. Revertido ambas veces con
`git checkout -- package.json package-lock.json && npm install --force`.

## Decisión

No usar `npm audit fix` ni `npm audit fix --force` en este proyecto sin revisar el diff de
`package.json` ANTES de reinstalar — y si aparece un cambio en `@react-native-firebase/*`,
`expo-router`, `expo-sqlite`, o cualquier paquete con versión pineada a propósito en
`app.config.ts`/CLAUDE.md, revertir sin aplicar. Las vulnerabilidades de dependencias de
desarrollo (`firebase-tools`, `drizzle-kit`, etc., que no llegan al bundle de producción) se
consideran de riesgo bajo y quedan documentadas aquí en vez de forzadas.

## Pendiente (fuera de esta pasada)

Actualizar `firebase`/`@firebase/firestore` (dependencias runtime reales con vulnerabilidades
altas) requiere subir de versión con cuidado, probando contra `@react-native-firebase/firestore`
real en dispositivo — no es un `npm audit fix` de una línea, es un trabajo aparte.
