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

## Resolución parcial (2026-11-13)

De las 76 vulnerabilidades que había en ese momento, se resolvieron 9 (la crítica y 6 altas) vía
`overrides` en `package.json`, forzando solo la versión de la dependencia TRANSITIVA vulnerable sin
tocar ningún paquete de primer nivel pinned: `shell-quote`, `compression`, `node-forge`,
`source-map-js`, `decode-uri-component`, `@xmldom/xmldom`. Todas viven solo en herramientas de
build-time (`react-devtools-core`, `@expo/plist` al procesar XML/plist en `prebuild`) — nunca en el
bundle que corre en el teléfono. Verificado después: `@react-native-firebase/*` sigue en `26.0.0`,
`expo-router` en `57.0.14`, `npx expo config` resuelve igual, `tsc`/`jest`/`eslint` en verde.

## Pendiente, evaluado y pospuesto a propósito

- **`firebase`/`@firebase/firestore`/`@grpc/grpc-js`** (devDependency, SDK web usado solo por
  `firebase-tools`/el Firebase Emulator local — no es lo que usa la app en el teléfono, eso es
  `@react-native-firebase/*`): el "fix" que sugiere `npm audit` es un DOWNGRADE a `9.14.0` (venimos
  de `^12.19.0`), así que no hay nada que aplicar ahí sin subir de major con cuidado aparte.
- **`@react-native-firebase/*`/`expo-router`**: mismo problema de siempre (ver arriba) — el único
  "fix" es la versión vieja que ya se sabe rompe el build. Sigue sin tocarse.
- **`zod`** (vía `eslint-plugin-react-hooks`/`@expo/cli`, instancias en `3.25.76`): el fix es
  `zod@4.x`, un major breaking de API — forzarlo por `overrides` arriesga romper esas herramientas
  de lint/CLI sin ningún beneficio real (es devDependency, nunca corre en el teléfono).
- **`js-yaml`** (`4.3.1` instalado, vulnerable; fix es `5.x`) e **`image-size`** (`1.2.1`
  instalado, vulnerable; fix es `2.x`, ESM-only): mismos motivos — major breaking en dependencias
  transitivas de build-tooling, riesgo de romper sin beneficio real (DoS local, no explotable
  remotamente).
- **`brace-expansion`** quedan 2 instancias vulnerables sin resolver: una colgando de
  `@bacons/apple-targets→glob→minimatch@9.0.9` (`2.1.4`, debería ser `2.1.7` como el resto del
  árbol) y otra de `eslint→minimatch@10.2.6` (`5.0.9`, necesita `5.0.12+`). Un `overrides` global
  rompería la otra línea de versión activa (`v2.x` vs `v5.x` son APIs incompatibles) — requeriría
  overrides anidados por cadena de padres, frágiles ante cualquier bump futuro de `glob`/`eslint`.
  Mismo criterio: DoS local en tooling, no vale el riesgo de un override frágil.
- **Resto de `moderate`/`high` con `isSemVerMajor: true`** (`drizzle-kit`, `eslint`, `jest`,
  `babel-jest`, `@typescript-eslint/*`, `firebase-tools`, `@firebase/rules-unit-testing`): en su
  mayoría el "fix" que sugiere `npm audit` es en realidad un DOWNGRADE (ya estamos en versiones más
  nuevas que las que aparecen como "fix" — confirmado con `npm ls` para `jest`/`@typescript-eslint/*`,
  ambos ya en la versión de nivel superior correcta; la vulnerabilidad reportada es de una copia
  transitiva vieja que trae otra herramienta por debajo). No requieren acción.
