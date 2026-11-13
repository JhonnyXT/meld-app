# 0002 — `src/demo/voiceParser.ts` es una copia textual del parser de la app

**Fecha:** histórica (previa a esta limpieza).

## Contexto

La portada tiene una demo interactiva de la pantalla "Hoy" (`src/demo/`), con "Agregar por voz"
funcionando en el navegador. Para eso necesita el mismo parser offline es/en que usa la app real
(`src/domain/voiceParser.ts` en `meld-app` raíz).

## Decisión

`landing/src/demo/voiceParser.ts` es una COPIA textual de `src/domain/voiceParser.ts`. Solo
cambian los imports: los tipos/constantes que el original toma de varios módulos de dominio de la
app (`domain/quickAdd.ts`, `domain/date.ts`, `i18n/translations.ts`) acá vienen todos de
`./model`, la versión reducida del modelo para la demo.

**Si se mejora el parser en la app, hay que copiar los cambios acá a mano** — no hay build step
que los sincronice. El archivo lleva `/* eslint-disable */` a propósito: es una copia, el lint
real se hace sobre el original en `meld-app/src/domain/voiceParser.ts`.

Código: `landing/src/demo/voiceParser.ts`.
