# 0007 — `es.ts` es la fuente de verdad del tipo `Dictionary`, y el tono es sin voseo

**Fecha:** histórica (previa a esta limpieza).

## Decisión

`src/i18n/es.ts` (español, idioma por defecto) es el archivo del que sale el tipo `Dictionary` —
`en.ts` debe tener exactamente la misma forma (TypeScript lo exige al tipar `en.ts` contra ese
tipo). Agregar una clave nueva, agregarla primero acá.

El español es neutro/latinoamericano, sin voseo: "elige", "únete" (forma "tú"), nunca "elegí",
"unite" (forma "vos") — mismo criterio que usa la app (`meld-app/CLAUDE.md` § "Idioma"). Esto no
lo hace cumplir ningún chequeo automático, así que un texto nuevo hay que revisarlo a mano.

Código: `landing/src/i18n/es.ts`, `landing/src/i18n/en.ts`.
