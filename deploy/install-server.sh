#!/usr/bin/env bash
# Installiert den Jura-Lernbegleiter auf einem Ubuntu-Server neben bestehenden Websites.
# Aufruf (im Projektordner):  sudo bash deploy/install-server.sh isabells-jura-studium.de deine@email.de
# - verändert keine bestehenden Websites; nutzt den vorhandenen Webserver (nginx, Apache oder Caddy)
# - App läuft nur lokal auf 127.0.0.1:3100, nach außen nur per HTTPS über den Webserver
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
PORT="${PORT:-3100}"
# BIND_HOST: 127.0.0.1 (default) or the gateway IP of a Docker network whose Caddy should reach the app (e.g. 172.18.0.1)
BIND_HOST="${BIND_HOST:-}"
if [ -z "$BIND_HOST" ] && [ -f /etc/systemd/system/jura-lernplattform.service ]; then
  BIND_HOST="$(grep -oP '(?<=-H )[0-9.]+' /etc/systemd/system/jura-lernplattform.service || true)"
fi
BIND_HOST="${BIND_HOST:-127.0.0.1}"
APP_USER=jura
DATA_DIR=/var/lib/jura-lernplattform
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE=jura-lernplattform

say() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Bitte mit sudo ausführen: sudo bash deploy/install-server.sh DOMAIN EMAIL"
[ -n "$DOMAIN" ] || die "Domain fehlt. Beispiel: sudo bash deploy/install-server.sh isabells-jura-studium.de deine@email.de"
DOMAIN="$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]')"
[ -f "$APP_DIR/package.json" ] || die "Skript bitte aus dem Projektordner heraus starten."

say "1/7 Systempakete"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git curl ca-certificates dnsutils >/dev/null

say "2/7 Node.js prüfen"
need_node=1
if command -v node >/dev/null 2>&1; then
  v=$(node -p "process.versions.node")
  major=${v%%.*}; rest=${v#*.}; minor=${rest%%.*}
  if [ "$major" -gt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -ge 13 ]; }; then
    need_node=0; echo "Node.js $v ist vorhanden – wird verwendet."
  else
    die "Node.js $v ist zu alt (mind. 22.13 nötig). Weil andere Websites davon abhängen könnten, ändere ich das nicht automatisch. Bitte melde dich – wir lösen das gemeinsam (z. B. separate Node-Version nur für diese App)."
  fi
fi
if [ "$need_node" -eq 1 ]; then
  echo "Installiere Node.js 24 LTS …"
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >/dev/null
fi
NODE_BIN="$(command -v node)"

say "3/7 Port $PORT prüfen"
if ss -ltn "( sport = :$PORT )" | grep -q ":$PORT"; then
  if systemctl is-active --quiet "$SERVICE"; then echo "Port gehört bereits zum Jura-Lernbegleiter (Neuinstallation/Update)."
  else die "Port $PORT ist schon belegt. Starte das Skript mit einem anderen Port, z. B.: sudo PORT=3200 bash deploy/install-server.sh $DOMAIN"; fi
fi

say "4/7 Benutzer, Ordner und App bauen"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$DATA_DIR"
chown -R "$APP_USER:$APP_USER" "$DATA_DIR" "$APP_DIR"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
chmod 750 "$DATA_DIR"
[ -f "$APP_DIR/.env.local" ] || { cp "$APP_DIR/.env.example" "$APP_DIR/.env.local"; chown "$APP_USER:$APP_USER" "$APP_DIR/.env.local"; chmod 600 "$APP_DIR/.env.local"; }
sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && npm ci --no-audit --no-fund && npm run build"

say "5/7 Dienst einrichten (startet automatisch, auch nach Neustart)"
cat > /etc/systemd/system/$SERVICE.service <<UNIT
[Unit]
Description=Jura-Lernbegleiter
After=network.target docker.service

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=DATA_DIR=$DATA_DIR
Environment=NODE_OPTIONS=--no-warnings
ExecStart=$NODE_BIN node_modules/next/dist/bin/next start -p $PORT -H $BIND_HOST
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$DATA_DIR $APP_DIR

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now $SERVICE
sleep 3
systemctl is-active --quiet $SERVICE || { journalctl -u $SERVICE -n 30 --no-pager; die "Dienst startet nicht (Log oben)."; }
curl -fsS -o /dev/null "http://$BIND_HOST:$PORT/login" && echo "App läuft lokal auf $BIND_HOST:$PORT."

say "6/7 DNS prüfen"
SERVER_IP="$(curl -fsS -4 https://api.ipify.org || true)"
DNS_IP="$(dig +short A "$DOMAIN" | tail -n1)"
echo "Server-IP: ${SERVER_IP:-unbekannt} · $DOMAIN zeigt auf: ${DNS_IP:-noch nichts}"
DNS_OK=0; [ -n "$DNS_IP" ] && [ "$DNS_IP" = "$SERVER_IP" ] && DNS_OK=1
WWW_OK=0; [ "$(dig +short A "www.$DOMAIN" | tail -n1)" = "$SERVER_IP" ] && WWW_OK=1
[ "$DNS_OK" -eq 1 ] || warn "Die Domain zeigt noch nicht auf diesen Server. HTTPS wird erst eingerichtet, wenn der DNS-Eintrag stimmt – danach das Skript einfach erneut ausführen."
NAMES="$DOMAIN"; [ "$WWW_OK" -eq 1 ] && NAMES="$DOMAIN www.$DOMAIN"
if [ -n "$EMAIL" ]; then CERT_MAIL="-m $EMAIL"; else CERT_MAIL="--register-unsafely-without-email"; fi

say "7/7 Webserver einbinden"
DOCKER_CADDY="$(docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' 2>/dev/null | awk '$2 ~ /caddy/ && /:443->/ {print $1; exit}')"
if [ -n "$DOCKER_CADDY" ]; then
  echo "Gefunden: Caddy im Docker-Container $DOCKER_CADDY (gehört zu einer anderen App)."
  echo "Dieser Caddy wird nicht automatisch verändert. Eintrag für die Lern-App (einmalig, siehe deploy/SERVER.md, Abschnitt Docker-Caddy):"
  echo "  $DOMAIN, www.$DOMAIN { reverse_proxy $BIND_HOST:$PORT { flush_interval -1 } }"
  [ "$BIND_HOST" = "127.0.0.1" ] && warn "Die App lauscht nur auf 127.0.0.1 – aus dem Container nicht erreichbar. Mit BIND_HOST=<Gateway-IP des Docker-Netzes> erneut ausführen."
elif systemctl is-active --quiet nginx; then
  echo "Gefunden: nginx"
  CONF=/etc/nginx/sites-available/$DOMAIN
  cat > "$CONF" <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name $NAMES;
    client_max_body_size 60m;
    add_header X-Robots-Tag "noindex, nofollow" always;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_read_timeout 600s;
    }
}
NGX
  ln -sf "$CONF" /etc/nginx/sites-enabled/$DOMAIN
  nginx -t && systemctl reload nginx
  if [ "$DNS_OK" -eq 1 ]; then
    command -v certbot >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
    D_ARGS="-d $DOMAIN"; [ "$WWW_OK" -eq 1 ] && D_ARGS="$D_ARGS -d www.$DOMAIN"
    certbot --nginx $D_ARGS --non-interactive --agree-tos --redirect $CERT_MAIL
  fi
elif systemctl is-active --quiet apache2; then
  echo "Gefunden: Apache"
  a2enmod -q proxy proxy_http headers >/dev/null
  ALIAS=""; [ "$WWW_OK" -eq 1 ] && ALIAS="ServerAlias www.$DOMAIN"
  cat > /etc/apache2/sites-available/$DOMAIN.conf <<APC
<VirtualHost *:80>
    ServerName $DOMAIN
    $ALIAS
    LimitRequestBody 62914560
    Header always set X-Robots-Tag "noindex, nofollow"
    ProxyPreserveHost On
    ProxyTimeout 600
    ProxyPass / http://127.0.0.1:$PORT/ flushpackets=on
    ProxyPassReverse / http://127.0.0.1:$PORT/
</VirtualHost>
APC
  a2ensite -q $DOMAIN >/dev/null && apache2ctl configtest && systemctl reload apache2
  if [ "$DNS_OK" -eq 1 ]; then
    command -v certbot >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot python3-certbot-apache >/dev/null
    D_ARGS="-d $DOMAIN"; [ "$WWW_OK" -eq 1 ] && D_ARGS="$D_ARGS -d www.$DOMAIN"
    certbot --apache $D_ARGS --non-interactive --agree-tos --redirect $CERT_MAIL
  fi
else
  echo "Kein nginx/Apache aktiv – verwende Caddy (HTTPS automatisch)."
  if ! command -v caddy >/dev/null; then
    if ss -ltn "( sport = :80 or sport = :443 )" | grep -qE ':(80|443) '; then
      die "Ports 80/443 sind von einem anderen Programm belegt. Bitte melde dich mit der Ausgabe von: sudo ss -ltnp | grep -E ':(80|443) '"
    fi
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https gnupg >/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg --yes
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq caddy >/dev/null
  fi
  mkdir -p /etc/caddy/sites
  grep -q "import sites/\*" /etc/caddy/Caddyfile 2>/dev/null || printf '\nimport sites/*\n' >> /etc/caddy/Caddyfile
  SITE_NAMES="$DOMAIN"; [ "$WWW_OK" -eq 1 ] && SITE_NAMES="$DOMAIN, www.$DOMAIN"
  cat > /etc/caddy/sites/$DOMAIN <<CDY
$SITE_NAMES {
    request_body { max_size 60MB }
    header X-Robots-Tag "noindex, nofollow"
    reverse_proxy 127.0.0.1:$PORT { flush_interval -1 }
}
CDY
  caddy validate --config /etc/caddy/Caddyfile >/dev/null && systemctl reload caddy || systemctl restart caddy
fi

say "Fertig"
if [ "$DNS_OK" -eq 1 ]; then echo "Öffne jetzt: https://$DOMAIN  – beim ersten Aufruf legst du dein Passwort fest."
else echo "Sobald der DNS-Eintrag stimmt: sudo bash deploy/install-server.sh $DOMAIN $EMAIL  (erneut ausführen)"; fi
echo "Daten & Sicherungen: $DATA_DIR · Status: systemctl status $SERVICE · Log: journalctl -u $SERVICE -f"
