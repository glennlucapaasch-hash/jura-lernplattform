# Offene Aufgaben und bekannte Einschränkungen

## Vom Nutzer zu erledigen / zu entscheiden
- [ ] **API-Schlüssel** in `.env.local` eintragen und das Modell wählen (Standard: Opus 5.5 für alles; Vorschlag: Sonnet 5.5 für den Dialog, um Kosten zu sparen)
- [x] Prüfungstermine bestätigt (04.11.2026): Prop 10.03.2027 und VerfR 11.03.2027 je 16–18 Uhr online, BGB-Kurzhausarbeit 05.–15.02.2027, Schuldrecht-AT-Hausarbeit 03.02.–31.03.2027
- [ ] Unterlagen **55103 Schuldrecht AT** hochladen (für Lernplan und Hausarbeitsvorbereitung)
- [ ] **Noch offen bei den Terminen**: Anmeldezeitraum März-Klausuren, EA-Abgabetermine und Abgabeweg; klären, ob die Einsendeaufgaben Zulassungsvoraussetzung sind. Danach in der App auf „bestätigt“ setzen. Die FernUni-Seiten waren aus der Entwicklungsumgebung nicht erreichbar.
- [ ] Unterlagen **Verfassungsrecht KE 2** hochladen (derzeit Platzhalter mit 700 Min. Schätzung)
- [ ] Prüfen, ob „Einsendeaufgabe Teil 3“ tatsächlich KE 1–3 abdeckt (Annahme in `content/deadlines.json`)

## Inhalt
- [x] Vorbereitete Lerneinheiten für alle Kapitel (30 Einheiten, 12 Übungsklausuren)
- [ ] Verfassungsrecht KE 2: Lerneinheit erstellen, sobald die Unterlagen vorliegen
- [ ] Lerneinheiten wurden automatisch geprüft (Struktur, Seitenbelege), aber nicht von einer Fachperson gegengelesen. Bei Zweifeln gilt das Skript bzw. das Gesetz.
- [ ] Mögliche Unstimmigkeiten im Skript, die beim Erstellen auffielen. Sie wurden in den Lerneinheiten vorsichtig formuliert und sollten anhand des Gesetzes geprüft werden:
  - KE 2, S. 30 / 51: Vernehmungstheorie, h.M. vs. Rechtsprechung
  - KE 2, S. 16 vs. 24: § 119 direkt oder analog bei fehlendem Erklärungsbewusstsein
  - KE 2, S. 43: Wortlaut zu § 149 (Antragender vs. Antragsempfänger)
  - KE 1, S. 49: „Aufrechnung (§ 378)“ im Prüfungsschema
  - KE 3, S. 51 vs. 17: verspätete Annahme, § 150 Abs. 1 vs. Abs. 2
  - KE 6, S. 22 vs. S. 20/§ 123 II: „grob fahrlässige Unkenntnis“ statt „kennen musste“
  - KE 6, S. 25: Maler-Beispiel als „Inhaltsirrtum § 119 Abs. 2“ bezeichnet (eigentlich Eigenschaftsirrtum)
  - KE 6, S. 35–36: Rechenfehler im Fall BGH NJW 1981, 1551 (11 × 72.000 € = 792.000 €)
  - KE 5, S. 59: ProstG-Aussage zum „Geliebtentestament“ steht in Spannung zur zitierten BGH-Rechtsprechung
  - KE 5, S. 45: zitierter Wortlaut von § 16 Abs. 2 UWG fehlt im Skript
  - KE 6, S. 48: fristlose Kündigung „nichtig wegen Verstoßes gegen § 573c“ (so das Skript)
  - KE 5, S. 17: Volljährigkeit „05.01.2018“ statt 2028; § 1825 mit wechselnden Absatzangaben (S. 17/32)
  - KE 5, S. 36: „§ 126 Satz 2“ statt § 126b S. 2; S. 69: § 108 Abs. 1/2 statt Abs. 3; S. 70 vs. S. 9: mittelbarer vs. unmittelbarer Besitz bei Übergabe
  - KE 4, S. 10: § 309 direkt auf Kauffrau angewandt (§ 310 Abs. 1 beachten); S. 12–13: 12-Monats-Klausel bei Verbrauchsgüterkauf (§ 476)
  - VerfR KE 1: Ausnahmen von der Gegenzeichnung (Art. 58 S. 2 GG) – Skript nennt auch Art. 68; Gesetzestext prüfen
  - VerfR KE 3: Fristen der Verfassungsbeschwerde als „§ 94 I/III BVerfGG“ zitiert (bisher § 93 BVerfGG) – nach der GG-Reform 2024 (Art. 93/94 GG neu) Gesetzestext prüfen; „§ 64 II GG“ meint BVerfGG
  - KE 7, S. 62–63: Lösung zu Aufgabe 2 bejaht Duldungs- und Anscheinsvollmacht zugleich; S. 45: Missbrauchsbeispiel ist eher Überschreitung der Vertretungsmacht
  - VerfR KE 1: Art. 72 III GG ohne Nr. 7; Sechsmonatsregel (Art. 72 III 2) zu weit; „Art. 83 III“ statt Art. 85 III 2; „Art. 3 III 2“ statt Art. 3 II 2 GG
- [ ] Gesetzestext BGB als eigenes Dokument hochladen (z. B. von gesetze-im-internet.de). Dann kann die Quellenprüfung auch Normen gegen den Gesetzestext abgleichen.

## Technik
- [ ] Test auf echten Apple-Geräten (Safari macOS/iPadOS/iOS), besonders Vorlesen und Diktat
- [ ] Diktat auf iPhone/iPad über das WLAN braucht HTTPS. Option: lokales Zertifikat (z. B. mkcert) oder ein Tunnel
- [ ] Die KI-Funktionen wurden nur gegen eine Mock-API getestet. Erster Lauf mit echtem Schlüssel: Kosten pro Einheit messen und die Schätzung im README anpassen
- [ ] Die Seitenzuordnung der Aufgaben zur Tageseinheit erfolgt grob über die Seitenbelege. Gibt es nur eine Lerneinheit pro §, wiederholen sich Aufgaben über mehrere Tage, bis der § erarbeitet ist.
- [ ] Optional: Umstieg auf PostgreSQL (nur sinnvoll bei Mehrbenutzer- oder Serverbetrieb)
- [ ] Optional: Hosting außerhalb des Macs (z. B. kleiner Server), damit iPhone-Nutzung unterwegs ohne laufenden Mac möglich wird. Erfordert HTTPS und eine Datenschutzabwägung.
- [ ] Optional: hochwertigere Cloud-Stimmen (kostenpflichtig, nur nach Zustimmung)
- [ ] Optional: Import der eigenen Hausarbeit/Einsendeaufgabe zur KI-Durchsicht (Gliederung und Stil, ohne Lösungserstellung)
