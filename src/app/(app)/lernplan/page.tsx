import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardBody, PageHeader, Badge, SectionTitle, formatDate, formatMinutes, Notice } from "@/components/ui";
import { currentPlan, today, getTopic, listModules } from "@/lib/repo/study";
import { PlanSettingsForm } from "./PlanSettingsForm";

const MODE_LABEL: Record<string, string> = { lernen: "Lernen", vorbereitung: "Prüfungsvorbereitung", hausarbeit: "Hausarbeit", frei: "frei", puffer: "Puffer / freies Üben" };

export default function LernplanPage() {
  const t = today();
  const { plan, settings, calibration } = currentPlan(t);
  const modules = new Map(listModules().map((m) => [m.id, m]));
  const weeks = new Map<string, typeof plan.days>();
  for (const d of plan.days) {
    const dt = new Date(d.date + "T12:00:00");
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const k = monday.toISOString().slice(0, 10);
    if (!weeks.has(k)) weeks.set(k, []);
    weeks.get(k)!.push(d);
  }
  const { requiredMinutes, availableMinutes } = plan.totals;
  return (
    <div className="space-y-8">
      <PageHeader title="Lernplan" subtitle={`Automatisch berechnet aus deinen Terminen, dem Stoffumfang und deinem Lernstand · ${settings.minutesPerDay} Min. pro Tag`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardBody><p className="text-sm text-ink-soft">Benötigt (Schätzung)</p><p className="mt-1 text-2xl font-semibold">{formatMinutes(requiredMinutes)}</p><p className="text-xs text-ink-faint">Erarbeitung aller noch offenen Abschnitte</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-ink-soft">Verfügbar bis zur letzten Prüfung</p><p className="mt-1 text-2xl font-semibold">{formatMinutes(availableMinutes)}</p><p className="text-xs text-ink-faint">75 % jeder Lerneinheit fließen in neuen Stoff und Anwendung</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-ink-soft">Dein Tempo</p><p className="mt-1 text-2xl font-semibold">{calibration === 1 ? "noch keine Daten" : `${Math.round(calibration * 100)} % der Schätzung`}</p><p className="text-xs text-ink-faint">wird aus deinen tatsächlichen Lernzeiten berechnet</p></CardBody></Card>
      </div>

      <div>
        <SectionTitle>Prüfungen und Meilensteine</SectionTitle>
        <div className="space-y-3">
          {plan.milestones.map((m) => (
            <Card key={m.id}>
              <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-sm text-ink-soft">{formatDate(m.date)} · Stoff: {formatMinutes(m.requiredMinutes)}{m.projectedDoneDate ? ` · voraussichtlich fertig am ${formatDate(m.projectedDoneDate)}` : " · wird bis dahin nicht fertig"}</p>
                </div>
                {m.feasible ? <Badge tone="ok"><CheckCircle2 size={13} /> machbar</Badge> : <Badge tone="warn"><AlertTriangle size={13} /> {m.deficitMinutes > 0 ? `fehlen ca. ${formatMinutes(m.deficitMinutes)}` : "knapp"}</Badge>}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {plan.warnings.length > 0 && (
        <Notice tone="warn" title="Vorschlag zur Priorisierung">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {plan.warnings.map((w, i) => <li key={i}>{w}</li>)}
            <li>Option 1: <strong>Kernstoff-Modus</strong> einschalten – weniger klausurrelevante Abschnitte (z. B. Entstehungsgeschichte) erhalten weniger Zeit, die Kernthemen (Willenserklärung, Vertragsschluss, Anfechtung, Stellvertretung, Geschäftsfähigkeit …) bleiben vollständig.</li>
            <li>Option 2: an einzelnen Tagen länger lernen (z. B. am Wochenende 90 Min.) – unten einstellbar.</li>
            <li>Option 3: Für die Einsendeaufgaben gezielt die abgefragten Abschnitte vorziehen; den übrigen Stoff danach nachholen.</li>
          </ul>
        </Notice>
      )}

      <PlanSettingsForm settings={settings} />

      <div>
        <SectionTitle>Tagesplan</SectionTitle>
        <div className="space-y-6">
          {[...weeks.entries()].slice(0, 20).map(([wk, days]) => (
            <div key={wk}>
              <p className="mb-2 text-sm font-medium text-ink-faint">Woche ab {formatDate(wk, { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
              <Card>
                <ul className="divide-y divide-line">
                  {days.map((d) => (
                    <li key={d.date} className={`flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:gap-4 ${d.date === t ? "bg-brand-50/60" : ""}`}>
                      <span className="w-32 shrink-0 text-sm text-ink-soft">{formatDate(d.date, { weekday: "short", day: "2-digit", month: "2-digit" })}{d.date === t ? " · heute" : ""}</span>
                      <div className="min-w-0 flex-1 text-[15px]">
                        {d.mode === "lernen" ? (
                          d.items.map((it) => {
                            const tp = getTopic(it.unitId);
                            return (
                              <p key={it.unitId} className="truncate">
                                <span className="mr-1.5 text-xs font-medium text-ink-faint">{modules.get(it.moduleId)?.short}</span>
                                {tp?.marker} {tp?.title} <span className="text-sm text-ink-faint">· {it.minutes} Min.</span>
                              </p>
                            );
                          })
                        ) : (
                          <p className={d.mode === "frei" ? "text-ink-faint" : "font-medium"}>{MODE_LABEL[d.mode]}{d.label ? `: ${d.label}` : ""}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-faint">Der Plan wird bei jedem Öffnen neu berechnet. Ausgelassene Tage, schnellere oder langsamere Bearbeitung und neue Termine fließen automatisch ein. Zeiten sind Schätzungen auf Grundlage des Textumfangs (ca. 70 Wörter Skripttext pro Minute inkl. Übungen) und werden mit deinem tatsächlichen Tempo nachjustiert.</p>
        <Link href="/termine" className="mt-2 inline-block text-sm text-brand-600">Termine bearbeiten →</Link>
      </div>
    </div>
  );
}
