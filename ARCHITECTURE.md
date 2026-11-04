# Architektur

## Überblick

```
Browser (Mac, iPad, iPhone)
   │  HTTPS/HTTP, Session-Cookie (JWT, httpOnly)
   ▼
Next.js 16 (App Router, Node-Runtime) ── src/proxy.ts: schützt alle Seiten/APIs
   ├─ UI: src/app/(app)/*  (Server Components + Client Components)
   ├─ API: src/app/api/*   (Route Handler, JSON / NDJSON-Streaming)
   ├─ src/lib/learning/*   Lernlogik (reine Funktionen, getestet)
   ├─ src/lib/docs/*       Dokumentenverarbeitung (Extraktion, Gliederung)
   ├─ src/lib/ai/*         KI-Funktionen (Claude API, RAG, Quellenprüfung)
   ├─ src/lib/repo/*       Datenzugriff (SQL)
   └─ src/lib/db/*         SQLite-Verbindung, Migrationen, Backup
          │
          ▼
data/  (lokal, gitignored)
   app.db        SQLite (WAL) inkl. FTS5-Volltextindex
   uploads/      Originaldateien
   backups/      tägliche Sicherungen
   secret.key    Signaturschlüssel für Sessions
```

## Technologie-Entscheidungen

| Bereich | Wahl | Begründung |
|---|---|---|
| Framework | Next.js 16, React 19, TypeScript | gewünscht; Server und UI in einem Projekt |
| Styling | Tailwind CSS 4, eigene Komponenten (`src/components/ui`) | konsistentes, schlankes Designsystem ohne schwere Bibliothek |
| Datenbank | **SQLite** (better-sqlite3) statt PostgreSQL | Ein Nutzer, lokaler Betrieb: kein Datenbankserver nötig, Backup = Dateikopie. Das SQL ist bewusst einfach gehalten, ein Umstieg auf PostgreSQL ist möglich (siehe TODO). |
| Suche / RAG | SQLite **FTS5 + BM25**, seitenweise indiziert | Quellen bis auf die Seite genau, offline und kostenlos. Anthropic bietet keine Embeddings an. Juristische Fachbegriffe lassen sich mit Schlagwortsuche gut finden. |
| PDF | pdf.js (unpdf auf dem Server, pdfjs-dist im Viewer) | Text seitenweise mit Zeilenrekonstruktion; integrierter Viewer springt auf die Seite |
| DOCX/TXT | mammoth / UTF-8, in Pseudo-Seiten zu ~450 Wörtern | |
| KI | Claude API (`@anthropic-ai/sdk`), Standardmodell Opus 5.5, pro Funktion umstellbar | Genauigkeit vor Kosten, solange der Nutzer nichts anderes wählt; serverseitige Fallbacks bei Ablehnungen |
| Wiederholung | FSRS (ts-fsrs) | aktueller Spaced-Repetition-Algorithmus |
| Sprache | Web Speech API (Vorlesen und Diktat) | kostenlos, gute deutsche Systemstimmen auf Apple-Geräten |
| Auth | Passwort (bcrypt) + signiertes JWT-Cookie, Proxy schützt alles | Single-User |

## Datenmodell (src/lib/db/migrations.ts)

- `modules`: Studienmodule (55101, 55104, 55100, Gesetze); neue Module werden in `KNOWN_MODULES` ergänzt
- `documents`, `pages`, `pages_fts`: Bibliothek; Volltext je Seite; `doc_key` (z. B. `BGB_2`) verbindet Quellenangaben mit dem Dokument
- `topics`: Gliederung (Ebene 1 = § bzw. A., Ebene 2 = I., II. …) mit Seitenbereich, Wortzahl, Aufwand, Schwierigkeit, Klausurrelevanz
- `topic_progress`: Status je Abschnitt und tatsächlich aufgewendete Minuten (dient der Kalibrierung)
- `lessons`: Lerneinheiten als JSON (`LessonPack`, siehe `content/LESSON_SCHEMA.md`), vorbereitet (`seed`) oder KI-generiert (`ai`)
- `attempts`: jede bearbeitete Aufgabe mit Kompetenzstufe, Schwierigkeit, Score, Zahl der Hinweise und Feedback
- `mistakes`: Fehleranalyse (inhaltlich / methodisch / sprachlich)
- `flashcards`, `card_reviews`: Karteikarten mit FSRS-Zustand
- `study_sessions`: geplante und durchgeführte Tageseinheiten inkl. Zeitprotokoll je Block
- `deadlines`: Termine und Fristen; `covers` + `prep_days` machen daraus Meilensteine für den Planer
- `chats`, `chat_messages`, `exams`, `notes`, `ai_usage`, `settings`

## Kernlogik

### Lernplan (`src/lib/learning/planner.ts`)
- Einheiten = Abschnitte der Ebene 2. Aufwand = Wörter ÷ 70 × Schwierigkeitsfaktor × persönliche Kalibrierung (tatsächliche ÷ geschätzte Minuten, begrenzt auf 0,6–1,6).
- Fristen je Einheit ergeben sich aus den Meilensteinen (Datum minus Vorbereitungstage), innerhalb eines Moduls bleibt die Reihenfolge erhalten.
- Geplant wird nach dem Prinzip „früheste Frist zuerst“. 75 % jeder Einheit fließen in den Stoff, der Rest in Wiederholung und Kontrolle.
- Hausarbeitsphasen, Vorbereitungstage, freie Wochentage und einzelne freie Tage werden berücksichtigt.
- Für jeden Meilenstein: benötigte vs. verfügbare Zeit, Defizit, voraussichtliches Fertigstellungsdatum und nötige Zusatzminuten pro Tag. Defizite werden als Warnung angezeigt; der Kernstoff-Modus reduziert Abschnitte geringer Klausurrelevanz.
- Berechnet wird bei jedem Aufruf neu, ausgelassene Tage verschieben den Plan also automatisch.

### Tageseinheit (`src/lib/learning/session.ts`)
10 Wiederholung · 15 neuer Stoff · 15 Übungen · 15 Anwendung · 5 Kontrolle, flexibel:
schwierige Themen bekommen mehr Erklärung; fehlt Wiederholungsstoff, wandert die Zeit in Stoff und Übungen;
an Vorbereitungs-, Einsendeaufgaben- und Hausarbeitstagen gibt es eigene Abläufe. Abschnitte und Aufgaben werden über
die Seitenbelege der Lerneinheit dem heutigen Abschnitt zugeordnet; bei der Aufgabenwahl stehen ungelöste Aufgaben auf der passenden Schwierigkeitsstufe vorn.

### Lernstand (`src/lib/learning/mastery.ts`)
Es gibt fünf Kompetenzstufen: Wiedererkennen, Abrufen, Verstehen, Anwenden und Formulieren.
- Die Belege jeder Stufe werden mit der Zeit abgewertet (Halbwertszeit 21 Tage) und bei genutzten Hinweisen geringer gewichtet (−20 % pro Hinweis).
- Bei wenigen Versuchen wird der Wert zurückhaltend angesetzt.
- Die Stufe **„sicher“** gibt es erst mit Belegen für *Anwenden* **und** *Formulieren*. Multiple-Choice-Aufgaben allein reichen dafür nie.
- Der Schwierigkeitsgrad passt sich an die letzten Ergebnisse an.

### RAG und Quellendisziplin (`src/lib/ai/sources.ts`, `tutor.ts`)
1. Bei der Retrieval-Phase holt die App per BM25 die passenden Seiten. Gibt es einen aktuellen Abschnitt, werden zusätzlich dessen Anfangsseiten mitgeschickt.
2. Die Passagen gehen als `<quellen>` mit IDs `[Q1]…` an das Modell, zusammen mit festen Quellenregeln.
3. Danach prüft die App die Antwort:
   - Verweise auf nicht gelieferte IDs werden entfernt.
   - Normen und Entscheidungen, die in keiner Passage vorkommen, werden als „nicht belegt“ markiert.
   - Fehlen Quellen ganz, wird das offen angezeigt.
4. Bei generierten Lerneinheiten werden Seitenbelege außerhalb der gelieferten Seiten verworfen. Fehlerhafte Aufgaben (z. B. ungültiger Antwortindex) werden ebenfalls aussortiert.

### Bewertung
- Geschlossene Aufgabentypen bewertet die App selbst (`grading.ts`, kostenlos). Dabei gibt es Teilpunkte und Toleranz für kleine Tippfehler.
- Freitext, Gutachtenschritte und Klausuren bewertet die KI über strukturierte Ausgaben (`grade.ts`):
  - Bewertungskriterien, wörtlich zitierte Fehlerstellen mit Kategorie, ein Hinweis ohne die Lösung und eine Verbesserungsformulierung
  - Ohne KI vergleichst du selbst mit der Musterlösung anhand der Bewertungspunkte.

## Sicherheit und Datenschutz
- Der API-Schlüssel steht nur in `.env.local` auf dem Server und wird nie an den Browser gegeben.
- Alle Routen außer Login sind geschützt (Proxy und httpOnly-Cookie, SameSite=Lax). Nach 10 Fehlversuchen greift eine 15-minütige Sperre.
- Uploads, Datenbank und Backups liegen in `data/` (gitignored). Im Repository stehen nur Strukturdaten (Gliederung, Seitenzahlen) und selbst formulierte Lerninhalte mit Seitenverweisen, keine Skripttexte.
- An die Claude-API gehen nur die jeweils nötigen Passagen.
