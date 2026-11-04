#!/usr/bin/env bash
# Holt die neueste Version von GitHub und startet die App neu. Aufruf: sudo bash deploy/update-server.sh
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
echo "▶ Hole neue Version …"
git config --global --get-all safe.directory | grep -qx "$APP_DIR" || git config --global --add safe.directory "$APP_DIR"
git -C "$APP_DIR" pull --ff-only
chown -R jura:jura "$APP_DIR"
echo "▶ Baue App …"
sudo -u jura -H bash -c "cd '$APP_DIR' && npm ci --no-audit --no-fund && npm run build"
systemctl restart jura-lernplattform
sleep 3
systemctl is-active --quiet jura-lernplattform && echo "✓ Aktualisiert und neu gestartet." || { journalctl -u jura-lernplattform -n 30 --no-pager; exit 1; }
