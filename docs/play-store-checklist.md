# Meld — checklist para publicar en Google Play

Anotado el 2026-09-24. Lo marcado **(verificar)** son reglas de Google que
cambian seguido: confirmarlas en Play Console antes de actuar.

## 1. Bloqueantes técnicos (arreglar antes de subir)

- [x] **Formato AAB** (2026-09-24): `eas.json` → perfil `prod` ahora usa
      `"buildType": "app-bundle"` (Play Store no acepta APK).
- [ ] **EAS en la máquina**: `npm i -g eas-cli` + `eas login` (interactivo, lo
      corre el dueño). Primer build: `npm run eas:prod`. Activar **Play App
      Signing** al crear la app en Play Console.
- [x] **Permisos de más** (2026-09-24, `app.config.ts`):
  - `CAMERA`: no se usaba. Quitado de `permissions`, se sacó el plugin de
    `expo-camera` y `expo-image-picker` tiene `cameraPermission: false`, que
    lo bloquea aunque una librería lo declare. El paquete `expo-camera` sigue
    instalado sin uso: se puede desinstalar para achicar la app.
  - `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO`/`READ_MEDIA_VISUAL_USER_SELECTED`:
    en `blockedPermissions`. Momentos usa el Photo Picker del sistema (no
    necesita permiso) y ya no se llama a `requestMediaLibraryPermissionsAsync`
    (`services/pickMomentPhoto.ts`).
  - `SCHEDULE_EXACT_ALARM`: en Android 14+ NO viene concedido por defecto en
    instalaciones nuevas, así que los recordatorios con hora pueden llegar
    tarde. Evaluar pedirlo con contexto (abrir la pantalla del sistema) o
    aceptar alarmas inexactas. Revisar la declaración de alarmas exactas en
    Play Console **(verificar)**.
- [ ] **Otros permisos del manifest generado** (visto en
      `android/app/src/main/AndroidManifest.xml` tras el prebuild):
  - `SYSTEM_ALERT_WINDOW` ("mostrar sobre otras apps"): la app no lo usa.
    Revisar si solo lo necesita el menú de desarrollo; si es así,
    bloquearlo solo en `prod` (`blockedPermissions` condicionado al
    variant) **(verificar)**.
  - `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (los agrega
    `expo-audio`): en Android 14+ Play Console pide declarar el tipo de
    servicio en primer plano y justificarlo. Si las notas de voz no se
    reproducen con la app en segundo plano, se pueden bloquear y evitar la
    declaración **(verificar)**.
- [x] **Pro no sale "de mentira"** (2026-09-24): la slide de Planes solo
      ofrece "Empezar gratis" + "Las funciones Pro llegan pronto", igual en
      dev/test/prod. La prueba simulada de 14 días solo se puede arrancar
      desde Ajustes → Plan en dev/test; como en `prod` nunca arranca, el
      aviso de fin de prueba tampoco puede aparecer ahí.
- [x] **Links de la slide de Planes** (2026-09-24): "Términos" y "Privacidad"
      abren `usemeld.vercel.app/{es|en}/terms` y `/privacy`
      (`src/constants/links.ts`). "Restaurar compra" se quitó hasta que haya
      tienda real.
- [ ] **Ícono definitivo**: CLAUDE.md dice que el logo sigue "en iteración".
      Confirmar la versión final antes de la ficha (cambiarlo después obliga
      a actualizar también las capturas).
- [ ] **Nivel de API objetivo y páginas de 16 KB** **(verificar)**: Play exige
      `targetSdk` reciente y librerías nativas alineadas a 16 KB. Expo SDK 57
      cumple; revisar las dependencias nativas de terceros
      (`react-native-android-widget`, `expo-speech-recognition`,
      `lottie-react-native` — esta última sin uso: si no se va a usar,
      sacarla).
- [ ] **Datos solo en el teléfono**: al desinstalar se pierde todo. Decidir si
      se activa el backup automático de Android (`allowBackup`) para la
      base SQLite, y decirlo bien en la política de privacidad.

## 2. Ficha y formularios de Play Console

- [ ] Cuenta de desarrollador de Google Play (pago único) y perfil de pagos si
      algún día se cobra.
- [ ] Nombre, descripción corta (80) y larga (4000), en español e inglés.
- [ ] Ícono 512×512 y gráfico destacado 1024×500.
- [ ] Capturas de teléfono (mínimo 2): se pueden reusar las de la landing
      (`landing/public/img/screen-*.png`) o sacar nuevas con el seed de `dev`.
- [ ] **URL de política de privacidad**: `https://usemeld.vercel.app/es/privacy`.
      Email de contacto ya puesto (jonathanblandon1017@gmail.com, también en
      el link "Soporte" de la landing). Faltan `[NOMBRE O RAZÓN SOCIAL]` y
      `[PAÍS / JURISDICCIÓN]` en `landing/src/legal/docs.ts`.
- [ ] **Seguridad de los datos (Data safety)**: la app no manda datos a ningún
      servidor. Declarar igual micrófono (dictado con el reconocedor del
      sistema, que puede procesar la voz en servidores de Google) y fotos
      (quedan en el teléfono). Sin anuncios, sin analítica.
- [ ] Cuestionario de clasificación de contenido, público objetivo (no
      infantil), declaración de anuncios (no tiene) y acceso a la app (no
      requiere login).
- [ ] Email de soporte en la ficha: jonathanblandon1017@gmail.com.

## 3. Prueba cerrada obligatoria (testers)

- Las cuentas **personales** nuevas deben correr una **prueba cerrada con al
  menos 12 testers inscritos durante 14 días seguidos** antes de poder
  publicar en producción **(verificar el número actual)**.
- Los testers instalan desde Play (pista de prueba cerrada) con el paquete de
  **producción** `app.meld`, variante `prod`. El variant `test`
  (`app.meld.mobile.test`) es otra app para Google y no cuenta.
- En `prod` los controles de simulación de Ajustes no aparecen (están gateados
  con `isDev`/`isTest`), así que los testers no pueden adelantar la prueba.
- **Lo que hicimos sí sirve para el período de testers**: el requisito es que
  la usen de verdad, no que paguen. Con Pro en "Próximamente" (o la
  simulación) pueden usar toda la app Free. Pedirles feedback concreto
  (recordatorios, widgets, dictado) y juntar 12 personas **antes** de
  empezar, porque los 14 días corren desde que están todos inscritos.

## 4. Cuando se active Pro de verdad (después del lanzamiento Free)

- [ ] Construir al menos una función Pro real (hoy ninguna existe; ver
      CLAUDE.md → "## Roadmap Pro").
- [ ] RevenueCat + Google Play Billing: productos mensual ($7.99) y anual
      ($59.99) con oferta de prueba gratis de 14 días en Play Console.
- [ ] Volver a ofrecer la prueba en la slide de Planes del onboarding, con un
      texto honesto: Google Play pide método de pago, así que nada de "Sin
      tarjeta ahora".
- [ ] Reemplazar la simulación: la fuente de verdad pasa a ser la suscripción
      (entitlement de RevenueCat); `trialStartedAt`/`subscribePro` se van.
- [ ] **Pasar de Free a Pro desde la app** (pedido explícito del usuario,
      2026-09-24). Hoy, en `prod`, un usuario Free **no tiene forma de pasar a
      Pro**: solo existe la fila de simulación de Ajustes, y solo en dev/test.
      Hace falta:
  - Fila **"Mejorar a Pro"** en Ajustes → Plan, visible para todos, que abra
    una pantalla de pago (paywall).
  - Que el paywall permita **pagar directo, sin prueba**, no solo "Probar 14
    días": quien ya decidió debe poder suscribirse de una vez (mensual o
    anual).
  - Google Play da la prueba gratis una sola vez por usuario y producto: si
    ya la usó, el paywall debe mostrar solo el precio, sin "14 días gratis"
    (RevenueCat indica si el usuario es elegible).
  - Lo mismo desde el aviso de fin de prueba ("Suscribirme") y, opcional,
    desde las funciones Pro bloqueadas (tocar una → paywall).
- [ ] "Restaurar compra", gestionar/cancelar suscripción (link a Play), y
      gating real de cada función por plan.
- [ ] Probar con **license testers** de Play Console: compran sin cobro real y
      los períodos se aceleran (la prueba gratis dura minutos, no 14 días)
      **(verificar tiempos exactos)**. Eso reemplaza el botón "Simular fin de
      la prueba".
