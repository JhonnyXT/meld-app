#!/usr/bin/env bash
# Corre firestore-tests/ contra el emulador de Firestore (lo levanta y lo apaga). Mismo JDK 21
# aparte que scripts/emulators.sh (firebase-tools lo exige; Gradle sigue con Java 17).
set -euo pipefail

JAVA21_HOME="${JAVA21_HOME:-$HOME/.local/jdk-21}"
if [ ! -x "$JAVA21_HOME/bin/java" ]; then
  echo "No hay JDK 21 en $JAVA21_HOME (firebase-tools lo exige). Ver scripts/emulators.sh." >&2
  exit 1
fi
export JAVA_HOME="$JAVA21_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

cd "$(dirname "$0")/.."
exec npx -y firebase-tools@15.34.1 emulators:exec --only firestore --project demo-meld \
  "npx jest -c jest.rules.config.js"
