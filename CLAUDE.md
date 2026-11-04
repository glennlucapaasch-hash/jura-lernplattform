@AGENTS.md

# Projektregeln (Jura-Lernbegleiter)
- Nutzer: Jurastudent (FernUni Hagen, EJP), keine Programmierkenntnisse → Erklärungen auf Deutsch, verständlich.
- Vor Arbeitsbeginn lesen: PROJECT_STATUS.md, TODO.md, ARCHITECTURE.md. Nach jeder Arbeitsphase PROJECT_STATUS.md und TODO.md aktualisieren.
- Niemals Studienbriefe, extrahierte Skripttexte oder `data/` committen (Urheberrecht). Lerninhalte nur in eigener Formulierung mit Seitenverweis.
- Keine erfundenen Normen, Urteile oder Fundstellen in Lerninhalten; Termine nur als „bestätigt“ markieren, wenn eine offizielle Quelle vorliegt.
- Kostenpflichtige Dienste nur nach Zustimmung des Nutzers.
- Tests: `npm test`, `npm run typecheck`, `npx eslint src`, `npm run build`; E2E gegen laufende App: `npm run test:e2e`.
