/** Writes docs/THEMENUEBERSICHT.md and docs/LERNPLAN.md from the curriculum and the planner (no course text). */
process.env.DATA_DIR = process.env.DATA_DIR ?? "/tmp/jura-overview-data";
import { writeFileSync } from "node:fs";
import { openTestDb } from "../src/lib/db";
import { listModules, listTopics, currentPlan, getTopic } from "../src/lib/repo/study";
import { deDate } from "../src/lib/learning/planner";

openTestDb();
const h = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`);
const from = process.argv[2] ?? new Date().toISOString().slice(0, 10);
let o = `# Themenübersicht und Aufwandsschätzung\n\nAutomatisch erzeugt aus den Inhaltsverzeichnissen der Studienbriefe (Stand ${deDate(from)}). Seitenangaben = Seiten im Studienbrief.\nAufwand = Erarbeitung inkl. Übungen bei ca. 70 Wörtern Skripttext pro Minute; schwierige Themen ×1,25, einführende ×0,85. Die App kalibriert die Werte mit deinem tatsächlichen Tempo.\n\nKlausurrelevanz (geschätzt): ●●● hoch · ●● mittel · ● gering\n\n`;
for (const m of listModules().filter((x) => x.id !== "gesetze")) {
  const ts = listTopics(m.id).filter((t) => t.kind === "study");
  const units = ts.filter((t) => t.parent_id || !ts.some((c) => c.parent_id === t.id));
  o += `## ${m.id} – ${m.title}\n\nGesamt: **${h(units.reduce((n, t) => n + t.est_minutes, 0))}** in ${units.length} Lernabschnitten\n\n`;
  let ke: number | null | undefined;
  for (const t of ts) {
    if (t.ke !== ke) { ke = t.ke; o += `\n### ${ke != null ? `Kurseinheit ${ke}` : "Studienbrief"}\n\n| Abschnitt | Seiten | Aufwand | Schwierigkeit | Relevanz |\n|---|---|---|---|---|\n`; }
    const name = t.level === 1 ? `**${t.marker} ${t.title}**` : `↳ ${t.marker} ${t.title}`;
    o += `| ${name} | ${t.pdf_start ? `${t.pdf_start}–${t.pdf_end}` : "–"} | ${t.est_minutes ? h(t.est_minutes) : ""} | ${["", "leicht", "mittel", "schwer"][t.difficulty]} | ${"●".repeat(t.exam_weight)} |\n`;
  }
  o += "\n";
}
writeFileSync("docs/THEMENUEBERSICHT.md", o);

const { plan } = currentPlan(from);
let p = `# Vorläufiger Lernplan (60 Minuten täglich)\n\nBerechnet am ${deDate(from)}. In der App wird der Plan bei jedem Öffnen aus deinem aktuellen Stand neu berechnet; diese Datei ist nur eine Momentaufnahme.\n\n## Machbarkeit je Termin\n\n| Termin | Datum | Benötigt | Verfügbar (kumuliert) | Ergebnis |\n|---|---|---|---|---|\n`;
for (const m of plan.milestones) p += `| ${m.title} | ${deDate(m.date)} | ${h(m.requiredMinutes)} | ${h(m.availableMinutes)} | ${m.feasible ? "machbar" : m.deficitMinutes ? `fehlen ca. ${h(m.deficitMinutes)} (≈ +${m.extraMinutesPerDayNeeded} Min./Tag)` : "knapp"} |\n`;
p += `\n**Gesamt:** benötigt ${h(plan.totals.requiredMinutes)}, verfügbar ${h(plan.totals.availableMinutes)} (75 % jeder Einheit für Stoff und Anwendung, 25 % Wiederholung und Lernkontrolle).\n\n`;
p += `### Ehrliche Einordnung\n\n${plan.warnings.map((w) => `- ${w}`).join("\n")}\n\nVorschläge: Kernstoff-Modus aktivieren; an Wochenenden 90 statt 60 Minuten; für die Einsendeaufgaben die abgefragten Abschnitte vorziehen; die Platzhalter-Schätzung für Verfassungsrecht KE 2 ersetzen, sobald die Unterlagen vorliegen.\n\n## Tagesplan\n\n| Datum | Inhalt |\n|---|---|\n`;
for (const d of plan.days) {
  const what = d.mode === "lernen" ? d.items.map((i) => { const t = getTopic(i.unitId)!; return `${t.module_id === "55101" ? "BGB" : t.module_id === "55104" ? "VerfR" : "Prop"} KE${t.ke ?? ""} ${t.marker} ${t.title} (${i.minutes}′)`; }).join("; ") : d.mode === "hausarbeit" ? "Hausarbeit" : d.mode === "vorbereitung" ? (d.milestoneKind === "einsendeaufgabe" ? d.label : `Prüfungsvorbereitung: ${d.label}`) : d.mode;
  p += `| ${deDate(d.date)} | ${what} |\n`;
}
writeFileSync("docs/LERNPLAN.md", p);
console.log("written");
