---
name: run-on-device
description: |
  Compilar e instalar Trove (Expo/React Native) en el Moto E7 Plus conectado por
  USB, y levantar Metro para desarrollo. Usar cuando el usuario pida correr, probar,
  ver en el celular, o verificar visualmente un cambio de Trove. Cubre el puerto
  8081 ocupado por otro proyecto (my-wallet-app), el workaround de adb en este
  sandbox, y los pasos de rebuild nativo cuando se agregan dependencias nativas.
license: MIT
metadata:
  project: anchor-app
  stack: expo-react-native
---

## Contexto del entorno

- Este sandbox ya corre otro proyecto Expo (`my-wallet-app`) con su Metro
  **permanentemente en el puerto 8081**. Nunca lo mates. Trove usa **8082**
  (o el siguiente libre).
- El celular del usuario (Motorola Moto E7 Plus) está conectado por **USB**, no por
  Wi-Fi — `adb devices` ya lo detecta. No perder tiempo con `--tunnel` (falla,
  `@expo/ngrok` no resuelve bien en este entorno) ni con la IP LAN (puede no ser
  alcanzable desde el sandbox).
- Android SDK ya instalado en `~/Android/Sdk`. JDK 17 en `~/.local/jdk-17`.

## Paso 0 — variables de entorno (repetir en cada invocación de Bash)

`ANDROID_HOME` **no persiste** entre llamadas separadas al tool Bash. Exportarlo
en la misma invocación que use `adb` o `gradlew`:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="$HOME/.local/jdk-17"
ADB="$ANDROID_HOME/platform-tools/adb"
```

## Paso 1 — ¿hace falta recompilar el APK nativo?

Solo si cambiaron dependencias con código nativo (cualquier paquete `expo-*` nuevo,
`react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`,
o cambios en `app.config.ts` → `plugins`/`ios`/`android`). Si solo cambió JS/TSX, saltar
al Paso 3 — Metro ya sirve el bundle nuevo con solo recargar la app.

```bash
cd /home/usuario/Documentos/me/code/anchor-app
APP_VARIANT=dev npx expo prebuild --platform android --clean

export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="$HOME/.local/jdk-17"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
cd android
./gradlew assembleDebug 2>&1 | tail -100
```

Build exitoso ≈ 6-9 min en frío. El APK queda en
`android/app/build/outputs/apk/debug/app-debug.apk`.

## Paso 2 — instalar el APK

Todo en la MISMA invocación de Bash (ver nota de adb más abajo):

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
ADB="$ANDROID_HOME/platform-tools/adb"
nohup "$ADB" nodaemon server -a > /tmp/adb-server.log 2>&1 &
sleep 2
"$ADB" devices -l
"$ADB" install -r /home/usuario/Documentos/me/code/anchor-app/android/app/build/outputs/apk/debug/app-debug.apk
```

> **Nota adb**: el sandbox mata el daemon de `adb` entre invocaciones de shell
> separadas del tool Bash. Si `adb devices`/`install` falla con
> `protocol fault (couldn't read status): Connection reset by peer`, es eso.
> Workaround: levantar `adb nodaemon server -a` en foreground (con `nohup ... &`)
> dentro de la misma llamada de Bash que los comandos cliente que siguen, y
> reutilizar esa llamada para todo lo que use adb después.

## Paso 3 — puerto y Metro

Si vas a lanzar un `expo start` nuevo, primero revisar si ya hay uno corriendo de
una sesión anterior (no asumas que no):

```bash
ss -ltnp 2>/dev/null | grep -E "8081|8082|8083"
```

- Si el 8081 tiene un proceso `my-wallet-app` → dejarlo, usar 8082.
- Si el 8082 ya tiene un proceso **de Trove** corriendo → no relanzar, solo seguir
  con el reload de la app.
- Si hay un proceso de Trove viejo/colgado en 8082 → matar por **PID exacto**
  (`kill <pid>`), nunca `pkill -f "expo start"` — el patrón hace self-match contra
  el propio comando del tool Bash y aborta la sesión.

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
ADB="$ANDROID_HOME/platform-tools/adb"
nohup "$ADB" nodaemon server -a > /tmp/adb-server.log 2>&1 &
sleep 2
"$ADB" reverse --remove-all
"$ADB" reverse tcp:8081 tcp:8082

cd /home/usuario/Documentos/me/code/anchor-app
nohup env APP_VARIANT=dev npx expo start --port 8082 > /tmp/expo-start.log 2>&1 &
disown
sleep 12
tail -30 /tmp/expo-start.log
```

`adb reverse tcp:8081 tcp:8082` hace que el celular, al pedir el bundle en su
puerto nativo 8081, en realidad hable con el Metro de Trove en el 8082 de esta
máquina — sin esto la app carga el bundle equivocado (el de `my-wallet-app`) o
nada.

## Paso 4 — abrir/recargar la app

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
ADB="$ANDROID_HOME/platform-tools/adb"
"$ADB" shell am force-stop app.trove.mobile
sleep 1
"$ADB" shell am start -n app.trove.mobile/.MainActivity
sleep 12
"$ADB" exec-out screencap -p > /tmp/anchor-check.png
```

Primer arranque en frío con caché de Metro vacía puede tardar 15-25s en bundlear
(ver "Bundling XX%…" en pantalla) — no asumir que colgó, esperar y volver a
capturar pantalla antes de diagnosticar.

## Interactuar y verificar

- `"$ADB" shell input tap X Y` / `"$ADB" shell input swipe X1 Y1 X2 Y2 DURATION_MS`
  para simular toques y gestos.
- **Nunca** usar `keyevent 4` (BACK) ni `keyevent 111` (ESCAPE) para cerrar un
  teclado sobre un modal — cierra el modal entero (dispara `onRequestClose`). Para
  bajar el teclado sin perder el modal, tocar el botón de colapsar del propio
  teclado (Gboard: chevron abajo a la izquierda, ~x=76 del ancho de pantalla) o un
  área no interactiva del modal.
- `"$ADB" shell input text "sin espacios"` es confiable; con `%s` (espacio
  codificado) a veces desestabiliza el foco del input en este Gboard — si hace
  falta un espacio real, escribir el texto en dos `input text` separados o evitar
  espacios en pruebas rápidas.
- Siempre `"$ADB" exec-out screencap -p > archivo.png` y leer la imagen antes de
  reportar éxito — no asumir que un tap funcionó solo porque el comando no dio
  error.

## Reset de datos para volver a ver el seed

`seedIfEmpty()` (`src/data/local/seed.ts`) solo inserta si la tabla está
completamente vacía. Si agregaste un ítem nuevo al seed y no aparece, es porque ya
hay datos de pruebas anteriores:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
"$ANDROID_HOME/platform-tools/adb" shell pm clear app.trove.mobile
```

Esto borra todos los datos de la app (vuelve al estado de instalación limpia) —
avisar antes si el usuario tenía datos de prueba que quería conservar.
