#!/bin/bash
# Doppelklick startet den Jura-Lernbegleiter auf dem Mac.
cd "$(dirname "$0")" || exit 1
echo "Jura-Lernbegleiter wird gestartet …"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js ist nicht installiert. Bitte von https://nodejs.org die LTS-Version installieren und dann erneut starten."
  open "https://nodejs.org/de/download"
  read -r -p "Enter zum Schließen"
  exit 1
fi
[ -f .env.local ] || cp .env.example .env.local
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "Installiere Abhängigkeiten (nur beim ersten Start oder nach Updates, ca. 1–3 Minuten) …"
  npm install --no-audit --no-fund || { read -r -p "Installation fehlgeschlagen. Enter zum Schließen"; exit 1; }
fi
if [ ! -f .next/BUILD_ID ] || [ -n "$(find src content package.json -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
  echo "Bereite die App vor (ca. 1 Minute) …"
  npm run build || { read -r -p "Build fehlgeschlagen. Enter zum Schließen"; exit 1; }
fi
( sleep 4; open "http://localhost:3000" ) &
echo ""
echo "Die App läuft unter http://localhost:3000"
echo "Vom iPhone/iPad im selben WLAN: http://$(scutil --get LocalHostName 2>/dev/null || hostname).local:3000"
echo "Zum Beenden dieses Fenster schließen oder Ctrl+C drücken."
echo ""
npm run start
