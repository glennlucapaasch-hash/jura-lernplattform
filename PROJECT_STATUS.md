# Projektstatus

Stand: 05.11.2026

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
- **30 vorbereitete Lerneinheiten** (`content/lessons/`). Sie decken alle Kapitel ab: BGB AT KE 1–8, Verfassungsrecht KE 1 und 3, Propädeutikum.
  - Jede Einheit enthält eine Erklärung (kurz und ausführlich), Definitionen, Prüfungsschemata, Aufgaben in allen 8 Formaten, einen Gutachtenfall und Karteikarten. Jedes Element ist mit Seitenangabe belegt.
  - Zusammen sind das **715 Aufgaben** und **426 Karteikarten**.
- **12 Übungsklausuren** mit Musterlösung im Gutachtenstil und Bewertungspunkten (`content/exams/`).
- Jede Lerneinheit wurde mit `scripts/validate-content.ts` geprüft: Struktur, Antwortindizes, Seitenbelege innerhalb des Abschnitts und Abdeckung aller Unterabschnitte.
- **Die App ist vollständig ohne KI nutzbar.** Die KI bleibt eine optionale Ergänzung für den Dozenten-Dialog, die automatische Korrektur und neue Fälle.

## Tests
- `npm test`: 20 Tests für Planer, Lernstand, Bewertung, Gliederungserkennung, Upload, Retrieval und Quellenprüfung
- `npm run test:e2e`: Login, Tageseinheit von Anfang bis Ende, Fortschritt gespeichert, Upload und Suche, Karteikarte, Termine und Kalenderexport, alle Seiten
- KI-Pfade (Dozent mit Streaming, Bewertung, Generierung von Lerneinheit und Klausurfall, Klausurauswertung, Kostenerfassung) gegen `tests/mock/anthropic-mock.mjs` geprüft
- Getestet in Chromium auf Desktop-Breite (1280 px) und iPhone-Viewport. Ein Test in Safari auf echten Apple-Geräten steht noch aus.

## Wie die Arbeit fortgesetzt wird
1. `TODO.md` lesen.
2. `npm install && npm test`
3. Mit `npm run dev` starten, dann `npm run import -- <Ordner mit PDFs>`, um Testdaten zu laden.

## Ergänzungen (04./05.11.2026)
- „Heute zu tun“-Liste, Häppchen-Ansicht mit Merke-Kästen und Kontrollfragen (alle Module), „Weiterlernen“ je Modul und je Abschnitt
- Lernplan verteilt die Tage fair auf alle Module (Anteil nach Stoffumfang bis zur jeweils letzten Prüfung) statt ein Modul nach dem anderen
- Einsendeaufgaben-Begleiter, AG- und Online-Lektionstermine, Anmeldezeitraum, MC-Klausurtraining Propädeutikum, Vertiefungen aus Begleitmaterial
- Schuldrecht AT (55103) entfernt
- Navigation in Gruppen (Heute & Planung · Fächer · Üben · Mehr) mit farbigen Direktlinks zu BGB (blau), Verfassungsrecht (rot) und Propädeutikum (grün)
- Lesestand je Abschnitt (automatisch nach den Häppchen oder per Klick), Quiz-Status je Frage (grün/rot), Statuszeichen je Abschnitt auf der Fachseite
- Quiz in Lerneinheiten mit „Zurück/Weiter“ und „Zu offenen Fragen“; Reiter-Navigation „Weiter: …“ am Seitenende
- Merksatz und „Im Gesetz lesen“ (Links zu gesetze-im-internet.de) je Abschnitt; Reiter „Gesetze“ und Gesetzesliste je Fach
- Leitfaden Kurzhausarbeit BGB (Vorbereitung bis Februar, 11-Tage-Plan, Tipps)
- Diktieren stabilisiert (keine doppelten Texte, Fehler werden angezeigt statt abzustürzen), Fehlerseite statt Absturz
