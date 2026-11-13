# 0014 — Tipo `Recognition` a mano, y por qué `VoiceOverlay` escucha solo una vez al abrir

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`VoiceOverlay.tsx` usa la Web Speech API del navegador (`SpeechRecognition`/
`webkitSpeechRecognition`) para "Agregar por voz".

## Decisiones

- **El tipo `Recognition` está escrito a mano** (no viene de `lib.dom.d.ts`): la Web Speech API no
  está en los tipos de TypeScript del navegador. El tipo cubre solo lo que el código realmente usa
  — no es un intento de tipar la API completa.
- **El `useEffect` que arranca el reconocedor (`begin()`) corre una sola vez al montar**, con
  `// eslint-disable-next-line react-hooks/exhaustive-deps` deliberado: agregar `begin` a las
  dependencias reiniciaría el reconocedor en cada render, no solo al abrir el overlay.

Código: `landing/src/demo/VoiceOverlay.tsx`.
