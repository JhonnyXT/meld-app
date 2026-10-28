#!/usr/bin/env bash
# Firebase Emulator Suite (Auth + Firestore) para el variant dev. Ver SYNC_ROADMAP.md → "Cómo
# funciona la sync" y CLAUDE.md. firebase-tools exige Java 21+, pero Gradle usa el Java 17 del
# sistema: aquí se usa un JDK 21 aparte solo para el emulador (por defecto ~/.local/jdk-21,
# portátil, sin sudo) — mismo patrón que my-wallet-app/scripts/emulators.sh.
# Puertos propios en firebase.json (8090/9098/4010/4410/4510, no los defaults 8080/9099/4000/
# 4400/4500): el emulador de my-wallet-app queda corriendo permanentemente en los puertos
# default, igual que Metro en el 8081 — no competir con él (ver "Gotchas del entorno" en
# CLAUDE.md).
set -euo pipefail

JAVA21_HOME="${JAVA21_HOME:-$HOME/.local/jdk-21}"
if [ ! -x "$JAVA21_HOME/bin/java" ]; then
  echo "No hay JDK 21 en $JAVA21_HOME (firebase-tools lo exige)." >&2
  echo "Instala Temurin 21 ahí, o exporta JAVA21_HOME con la ruta de otro JDK 21+." >&2
  exit 1
fi
export JAVA_HOME="$JAVA21_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

cd "$(dirname "$0")/.."
exec npx -y firebase-tools@15.34.1 emulators:start \
  --project demo-meld --import .firebase-emulator --export-on-exit .firebase-emulator
