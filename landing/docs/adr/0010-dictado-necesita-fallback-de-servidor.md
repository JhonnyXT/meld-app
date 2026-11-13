# 0010 — `useSyncExternalStore` con snapshot de servidor fijo en `false`

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`DemoPhone.tsx` necesita saber si el navegador soporta dictado por voz (Web Speech API) para
mostrar o no el botón de micrófono — pero el dictado depende del navegador, y Next.js renderiza
primero en el servidor, donde no existe `window`.

## Decisión

`voiceSupported` se lee con `useSyncExternalStore(noopSubscribe, () => getSpeechRecognition() !==
null, () => false)` — el tercer argumento (snapshot de servidor) queda fijo en `false`. Sin eso,
el render del servidor y el primer render del cliente podrían no coincidir (el servidor no tiene
`window.SpeechRecognition`), lo que dispara un error de hydration mismatch de React/Next.js.

Código: `landing/src/demo/DemoPhone.tsx`.
