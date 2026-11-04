# Projektstatus

Stand: 04.11.2026

## Phasen

| Phase | Inhalt | Status |
|---|---|---|
| 1 Projektgrundlage | Architektur, Struktur, Datenmodell, Designsystem, Analyse aller 8 BGB-KE, Themenübersicht, Aufwand, vorläufiger Lernplan | ✅ fertig |
| 2 Funktionsfähige Basis | Dashboard, Module, Upload (PDF/DOCX/TXT), Extraktion, Gliederungserkennung, Volltextsuche, PDF-Viewer, Quellenverwaltung, Login, Termine & Fristen inkl. Kalenderexport | ✅ fertig |
| 3 KI-Lernsystem | KI-Dozent (Streaming, Kontext, sokratisch, 9 Befehle), Quellenprüfung, Quiz (8 Formate), geführte Tageseinheit, Fortschrittsspeicherung, automatische Erstellung von Lerneinheiten | ✅ fertig |
| 4 Juristisches Training | Gutachtenstil-Trainer (4 Schritte, Fehlerkategorien, markierte Stellen), Klausurumgebung (Timer, Autosave, Abgabe, KI-Auswertung, Musterlösung, Vergleich, Fehlerdokumentation) | ✅ fertig |
| 5 Lernplanung | adaptiver Planer (Kalibrierung, Neuberechnung, Defizitanzeige, Kernstoff-Modus), FSRS-Wiederholung, Lernstandsanalyse mit Diagrammen | ✅ fertig |
| 6 Erweiterungen | Vorlesen (Pause, Wiederholen, Tempo, Stimme), Diktat, mobile Navigation, Archiv & Suche, Notizen, Export/Backup | ✅ Grundumfang fertig, Ausbau siehe TODO.md |
| 7 Abschlusstests | Unit-Tests, E2E-Test, KI-Pfade gegen Mock-API, Bedienungsanleitung | ✅ fertig; Test mit echtem API-Schlüssel steht noch aus |

## Inhalte
- Gliederung aller Unterlagen: `content/curriculum/*.json` (BGB KE 1–8, VerfR KE 1+3 sowie Platzhalter für KE 2, Propädeutikum)
- Vorbereitete Lerneinheiten mit Erklärung kurz und ausführlich, Definitionen, Schemata, 17–18 Aufgaben in allen 8 Formaten, Gutachtenfall und Karteikarten:
  - `bgb-ke1-gutachten-privatautonomie` (KE 1: Gutachten, § 1)
  - `bgb-ke2-willenserklaerung` (KE 2: § 2)
  - `bgb-ke2-zugang` (KE 2: § 3)
  - `bgb-ke3-vertragsschluss` (KE 3: §§ 4–6)
- Für alle weiteren Kapitel erstellt die KI Lerneinheiten auf Knopfdruck, sobald ein API-Schlüssel hinterlegt ist.

## Tests
- `npm test`: 20 Tests für Planer, Lernstand, Bewertung, Gliederungserkennung, Upload, Retrieval und Quellenprüfung
- `npm run test:e2e`: Login, Tageseinheit von Anfang bis Ende, Fortschritt gespeichert, Upload und Suche, Karteikarte, Termine und Kalenderexport, alle Seiten
- KI-Pfade (Dozent mit Streaming, Bewertung, Generierung von Lerneinheit und Klausurfall, Klausurauswertung, Kostenerfassung) gegen `tests/mock/anthropic-mock.mjs` geprüft
- Getestet in Chromium auf Desktop-Breite (1280 px) und iPhone-Viewport. Ein Test in Safari auf echten Apple-Geräten steht noch aus.

## Wie die Arbeit fortgesetzt wird
1. `TODO.md` lesen.
2. `npm install && npm test`
3. Mit `npm run dev` starten, dann `npm run import -- <Ordner mit PDFs>`, um Testdaten zu laden.
