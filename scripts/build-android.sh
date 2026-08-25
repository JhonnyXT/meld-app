#!/usr/bin/env bash
# Build local por variant (dev/test). Ver CLAUDE.md → Build variants.
set -euo pipefail

VARIANT="${1:-}"

case "$VARIANT" in
  dev)
    GRADLE_TASK="assembleDebug"
    APK="android/app/build/outputs/apk/debug/app-debug.apk"
    PACKAGE_ID=""
    ;;
  test)
    GRADLE_TASK="assembleRelease"
    APK="android/app/build/outputs/apk/release/app-release.apk"
    # `test` es el variant para probar builds "limpios" — a diferencia de `dev`
    # (que conserva datos a propósito), cada build:test desinstala primero para
    # arrancar siempre con la base de datos vacía. Ver CLAUDE.md → Build variants.
    PACKAGE_ID="app.trove.mobile.test"
    ;;
  prod)
    echo "El variant prod se construye con EAS, no en local:" >&2
    echo "  npm run eas:prod" >&2
    echo "Un assembleRelease local se firmaría con la debug keystore y Play Protect lo bloquearía." >&2
    exit 1
    ;;
  *)
    echo "Uso: $0 <dev|test>" >&2
    exit 1
    ;;
esac

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdk-17}"
export APP_VARIANT="$VARIANT"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LAST_VARIANT_FILE="android/.last-variant"
if [ -d android ] && [ "$(cat "$LAST_VARIANT_FILE" 2>/dev/null || true)" = "$VARIANT" ]; then
  echo "==> prebuild ($VARIANT, incremental — mismo variant que el último build)"
  npx expo prebuild --platform android
else
  echo "==> prebuild ($VARIANT, clean — cambió el variant o es el primer build)"
  npx expo prebuild --platform android --clean
fi
echo "$VARIANT" > "$LAST_VARIANT_FILE"

echo "sdk.dir=$ANDROID_HOME" > android/local.properties

echo "==> gradle $GRADLE_TASK"
(cd android && ./gradlew "$GRADLE_TASK")

ADB="$ANDROID_HOME/platform-tools/adb"

# Workaround del sandbox de desarrollo: el daemon de adb muere si no se levanta
# en primer plano dentro de la misma invocación de shell — ver
# .claude/skills/run-on-device/SKILL.md. Inofensivo en un entorno real (ya con
# daemon corriendo, este comando no hace nada distinto).
nohup "$ADB" nodaemon server -a >/tmp/adb-server.log 2>&1 &
sleep 2

if "$ADB" get-state >/dev/null 2>&1; then
  if [ -n "$PACKAGE_ID" ]; then
    echo "==> adb uninstall $PACKAGE_ID (build limpio, sin datos previos)"
    "$ADB" uninstall "$PACKAGE_ID" >/dev/null 2>&1 || true
  fi
  echo "==> adb install"
  "$ADB" install -r "$APK"
else
  echo "==> sin dispositivo conectado; APK listo en $APK"
fi
