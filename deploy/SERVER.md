# Jura-Lernbegleiter auf dem eigenen Server (IONOS VPS, Ubuntu)

Ziel: `https://isabells-jura-studium.de`. Die App läuft neben den bestehenden Websites. Das Skript erkennt den
vorhandenen Webserver (nginx, Apache oder Caddy) und ändert keine bestehenden Websites.

## 1. Domain auf den Server zeigen lassen
1. IONOS-Kundenbereich → **Domains & SSL**. Falls die Domain noch nicht registriert ist, dort registrieren.
2. Bei der Domain auf **DNS** klicken:
   - Einen **A-Eintrag** für `@` mit der **IP-Adresse deines VPS** anlegen oder ändern. Die IP steht unter *Server & Cloud*.
   - Optional einen zweiten A-Eintrag für `www` mit derselben IP.
3. Es dauert 5–60 Minuten, bis der Eintrag weltweit gilt.

## 2. Auf dem Server anmelden
Am Mac im Programm **Terminal**:
```bash
ssh root@DEINE-SERVER-IP
```
Statt `root` gegebenenfalls deinen Benutzernamen verwenden. Das Passwort steht im IONOS-Kundenbereich beim Server.

## 3. Zugangsschlüssel für GitHub (einmalig)
Das Repository ist privat. Der Server bekommt deshalb einen eigenen Schlüssel, der nur lesen darf.
```bash
sudo ssh-keygen -t ed25519 -f /root/.ssh/jura_deploy -N "" -C "jura-server"
```
```bash
printf 'Host github-jura\n  HostName github.com\n  User git\n  IdentityFile /root/.ssh/jura_deploy\n' | sudo tee -a /root/.ssh/config
```
```bash
sudo cat /root/.ssh/jura_deploy.pub
```
Kopiere die angezeigte Zeile, die mit `ssh-ed25519` beginnt. Dann auf GitHub:
- Öffne das Repository **jura-lernplattform** und gehe zu **Settings → Deploy keys → Add deploy key**.
- Titel: „Server“. Füge die Zeile ein und lass „Allow write access“ **aus**.
- Klicke auf **Add key**.

## 4. App herunterladen und installieren
```bash
sudo git clone github-jura:glennlucapaasch-hash/jura-lernplattform.git /opt/jura-lernplattform
```
Die Frage „Are you sure you want to continue connecting“ beantwortest du mit `yes`.
```bash
cd /opt/jura-lernplattform && sudo bash deploy/install-server.sh isabells-jura-studium.de DEINE@EMAIL.DE
```
Das dauert 3–6 Minuten. Am Ende steht „Fertig“.
- Hat das DNS noch nicht gestimmt, wird HTTPS übersprungen. Führe den Befehl dann später einfach noch einmal aus.

## 5. Erster Aufruf
Öffne `https://isabells-jura-studium.de`, lege ein Passwort fest und lade die Skripte in der **Bibliothek** hoch.

## Updates
```bash
cd /opt/jura-lernplattform && sudo bash deploy/update-server.sh
```

## Nützliche Befehle
- Status: `sudo systemctl status jura-lernplattform`
- Log: `sudo journalctl -u jura-lernplattform -f`
- Neustart: `sudo systemctl restart jura-lernplattform`
- Daten und tägliche Sicherungen liegen in `/var/lib/jura-lernplattform`. Lade sie gelegentlich zusätzlich auf den Mac herunter:
  `scp -r root@DEINE-SERVER-IP:/var/lib/jura-lernplattform/backups ~/Documents/Jura-Backups`
- Optionaler KI-Schlüssel: `sudo nano /opt/jura-lernplattform/.env.local`, danach die App neu starten.

## Hinweise
- Die Suchmaschinen-Indexierung ist abgeschaltet (`noindex`, `robots.txt`). Die App ist ohne Passwort nicht nutzbar.
- Die Studienbriefe liegen auf deinem Server. Das ist nur für deine private Nutzung zulässig, gib den Zugang nicht weiter.
- Über HTTPS funktioniert auf iPhone und iPad auch das Diktieren.

## Sonderfall: Ports 80/443 gehören dem Caddy-Container einer anderen App (Docker)
Das ist bei diesem Server so (Kostenerstattungs-App, Caddy im Container `kostenerstattung-caddy-1`, Netz-Gateway `172.18.0.1`).
1. Die Lern-App lauscht auf dem Gateway des Docker-Netzes:
   `sudo sed -i 's/-H 127.0.0.1/-H 172.18.0.1/; s/^After=network.target$/After=network.target docker.service/' /etc/systemd/system/jura-lernplattform.service && sudo systemctl daemon-reload && sudo systemctl restart jura-lernplattform`
2. Ist die Firewall `ufw` aktiv, muss Port 3100 für das Docker-Netz freigegeben werden: `sudo ufw allow from 172.18.0.0/16 to any port 3100 proto tcp`
3. Im Caddyfile der anderen App (`/opt/kostenerstattung/deploy/Caddyfile`) wird am Ende ein Block ergänzt, nach einer Sicherungskopie und nur mit `tee -a`, weil die Datei als Bind-Mount eingebunden ist:
   ```
   isabells-jura-studium.de, www.isabells-jura-studium.de {
   	encode zstd gzip
   	request_body {
   		max_size 60MB
   	}
   	header X-Robots-Tag "noindex, nofollow"
   	reverse_proxy 172.18.0.1:3100 {
   		flush_interval -1
   	}
   }
   ```
4. Danach Caddy neu laden: `docker exec kostenerstattung-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile`
5. **Wichtig:** Wenn die Kostenerstattungs-App neu ausgerollt wird und dabei ihr Caddyfile aus Git überschreibt, geht der Block verloren. Ihn deshalb auch in deren Repository übernehmen.
6. Erneutes Ausführen von `install-server.sh` behält die Adresse 172.18.0.1 bei.
