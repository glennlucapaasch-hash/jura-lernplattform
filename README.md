# Jura-Lernbegleiter

Persönlicher Studienbegleiter für das Studium „Erste Juristische Prüfung“ an der FernUniversität in Hagen.
Die App kennt deine Studienbriefe, plant deine Lernzeit, führt dich täglich durch eine 60-Minuten-Lerneinheit,
fragt dich ab, trainiert den Gutachtenstil und dokumentiert deinen Lernstand.

Sie läuft **lokal auf deinem Mac**. Deine Unterlagen und Lerndaten bleiben auf deinem Rechner.
Mit iPhone und iPad greifst du im selben WLAN darauf zu.

---

## 1. Einmalige Einrichtung auf dem Mac (ca. 15 Minuten)

### Schritt 1: Node.js installieren
1. Öffne <https://nodejs.org/de/download>.
2. Lade die **LTS-Version** für macOS herunter (Datei `.pkg`).
3. Starte die heruntergeladene Datei und folge dem Installationsassistenten.

### Schritt 2: Die App herunterladen (mit GitHub Desktop)
1. Installiere **GitHub Desktop** von <https://desktop.github.com> und melde dich mit deinem GitHub-Konto an.
2. Klicke auf *File → Clone Repository …*, wähle `glennlucapaasch-hash/jura-lernplattform` und als Ziel z. B. `Dokumente`. Dann auf *Clone* klicken.
3. Updates holst du später mit dem Knopf **„Fetch origin“** und danach **„Pull origin“**.

### Schritt 3: Starten
1. Öffne im Finder den Ordner `Dokumente/jura-lernplattform`.
2. Doppelklicke auf **„Jura-Lernbegleiter starten.command“**.
   - Falls macOS meldet, dass die Datei nicht geöffnet werden kann: Rechtsklick auf die Datei → *Öffnen* → nochmals *Öffnen*.
   - Beim ersten Start dauert es 2–4 Minuten. Die App wird installiert und vorbereitet.
3. Der Browser öffnet sich mit <http://localhost:3000>. Dort legst du beim ersten Mal ein **Passwort** fest.

> Alternative im Terminal: `cd ~/Dokumente/jura-lernplattform` und danach `bash "Jura-Lernbegleiter starten.command"`

### Schritt 4: Studienbriefe hochladen
Öffne in der App **Bibliothek** und ziehe deine PDFs hinein (BGB_1.pdf … BGB_8.pdf, Verfassungsrecht, Propädeutikum, GG).
Die App erkennt Modul und Kurseinheit automatisch, liest den Text Seite für Seite aus und macht ihn durchsuchbar.

Alternativ kannst du einen ganzen Ordner auf einmal importieren. Das geht im Terminal aus dem Projektordner:
```bash
npm run import -- "/Users/DEINNAME/Downloads/Skripte"
```

### Schritt 5 (optional, kostenpflichtig): KI-Funktionen aktivieren
1. Lege auf <https://console.anthropic.com> ein Konto an. Lade unter *Billing* Guthaben auf (z. B. 10 $) und setze unter *Limits* ein Monatslimit.
2. Erzeuge unter *API Keys* einen Schlüssel.
3. Öffne im Projektordner die Datei **`.env.local`**. Sie wird beim ersten Start automatisch angelegt. Falls du sie im Finder nicht siehst, drücke `⌘ + ⇧ + .`, dann werden versteckte Dateien angezeigt. Öffne sie mit TextEdit.
4. Trage den Schlüssel ein: `ANTHROPIC_API_KEY=sk-ant-…` und speichere.
5. Schließe das Terminal-Fenster der App und starte sie neu (Doppelklick wie in Schritt 3).

**Die App ist vollständig ohne KI nutzbar.** Alle Kapitel sind als Lerneinheiten vorbereitet: 30 Einheiten mit 715 Aufgaben, 426 Karteikarten und 12 Übungsklausuren.
Ohne Schlüssel funktionieren: Lernplan, Termine, Bibliothek und Suche, die vorbereiteten Lerneinheiten,
alle Quizformate, Karteikarten, Klausurtraining mit Selbstbewertung und Vorlesen.
Mit Schlüssel kommen dazu: der KI-Dozent, die Bewertung freier Antworten und Gutachten, neue Lerneinheiten für
alle weiteren Kapitel und neue Übungsklausuren mit Auswertung.
Was du verbrauchst, siehst du unter *Einstellungen*. Zusätzlich gibt es dort ein Monatslimit in der App (Standard: 30 $).

---

## 2. Tägliche Nutzung
1. Starte die App mit einem Doppelklick auf „Jura-Lernbegleiter starten.command“.
2. Klicke im Dashboard auf **„Heutige Lerneinheit starten“**.
3. Die App führt dich durch die Blöcke: Wiederholung, neuer Stoff, Übungen, Anwendung und Lernkontrolle.
   Am Ende gibst du an, ob der Abschnitt erarbeitet ist.

Den Plan musst du nicht pflegen. Hast du einen Tag ausgelassen oder warst schneller oder langsamer,
rechnet die App beim nächsten Öffnen alles neu.

### iPhone und iPad
- Der Mac muss eingeschaltet sein und die App laufen.
- Öffne auf dem iPhone in Safari die Adresse, die im Terminalfenster angezeigt wird, z. B. `http://Dein-Mac.local:3000`.
- Für ein App-Symbol auf dem Home-Bildschirm: in Safari auf *Teilen* tippen, dann *Zum Home-Bildschirm*.
- Vorlesen funktioniert auf dem iPhone. Die **Spracheingabe (Diktieren)** im Browser verlangt auf iPhone und iPad meist
  eine HTTPS-Verbindung und ist im WLAN-Betrieb deshalb eventuell nicht verfügbar. Nutze dann die Diktiertaste der iPhone-Tastatur.

### Termine
Unter **Termine & Fristen** stehen alle Fristen mit Countdown. Über *In Kalender übernehmen (.ics)* kommen sie
in den Kalender von iPhone und Mac, mit Erinnerungen 14, 3 und 1 Tag vorher.
Termine mit dem Status **„unbestätigt“** musst du anhand der offiziellen FernUni-Seiten prüfen.

---

## 3. Datensicherung
- Täglich beim Start legt die App automatisch eine Sicherung in `data/backups/` an. Die 20 neuesten bleiben erhalten.
- Unter *Einstellungen* kannst du jederzeit eine Sicherung anlegen und alle Lerndaten als JSON exportieren.
- Die Datenbank ist eine einzige Datei, `data/app.db`. Sichere den Ordner `data/` zusätzlich mit Time Machine.
- Der Ordner `data/` wird **nie** zu GitHub hochgeladen, denn die Studienbriefe sind urheberrechtlich geschützt.

---

## 4. Für Entwickler
```bash
npm install
npm run dev        # Entwicklungsserver auf http://localhost:3000
npm test           # Unit- und Integrationstests (Vitest)
npm run typecheck
npm run build && npm start
npm run test:e2e   # Browser-Test gegen eine laufende App (benötigt Playwright)
npm run overview   # docs/THEMENUEBERSICHT.md und docs/LERNPLAN.md neu erzeugen
```
- Architektur: [ARCHITECTURE.md](ARCHITECTURE.md)
- Projektstand: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- Offene Aufgaben: [TODO.md](TODO.md)
- Themenübersicht mit Aufwand: [docs/THEMENUEBERSICHT.md](docs/THEMENUEBERSICHT.md)
- Vorläufiger Lernplan: [docs/LERNPLAN.md](docs/LERNPLAN.md)
- Bedienungsanleitung: [docs/BEDIENUNGSANLEITUNG.md](docs/BEDIENUNGSANLEITUNG.md)

**Hinweis:** Rückmeldungen und Bewertungen der KI sind Lernhilfen und **keine offizielle universitäre Bewertung**.
