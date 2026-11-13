# 0009 — `dateFormat.ts` vive en archivo propio para evitar un import circular

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`dayTitle`/`dayLong` (formato de fecha para la demo interactiva) los usan tanto `DemoPhone.tsx`
como `QuickAddSheet.tsx` — y `DemoPhone` renderiza `QuickAddSheet`.

## Decisión

Las funciones viven en `landing/src/demo/dateFormat.ts`, un archivo propio, en vez de adentro de
`DemoPhone.tsx`. Si se movieran a `DemoPhone.tsx` y `QuickAddSheet` las importara desde ahí, se
formaría un import circular entre los dos (`DemoPhone` → `QuickAddSheet` → `DemoPhone`).

Código: `landing/src/demo/dateFormat.ts`.
