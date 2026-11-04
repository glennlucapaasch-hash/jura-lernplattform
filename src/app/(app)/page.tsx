import Link from "next/link";
import { PlayCircle, AlarmClock, AlertTriangle, Layers, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card, CardBody, ButtonLink, Badge, SectionTitle, CountBar, formatDate, formatMinutes, Notice } from "@/components/ui";
import { currentPlan, listModules, listDeadlines, today, progressMap, studyUnits, getTopic } from "@/lib/repo/study";
import { getOrCreateTodaySession, dueCardIds } from "@/lib/repo/session";
import { daysBetween } from "@/lib/learning/planner";
import { aiAvailable } from "@/lib/ai/client";
import type { SessionPlan } from "@/lib/learning/session";

const BLOCK_ICON: Record<string, string> = { review: "↻", new: "✦", exercise: "✎", application: "⚖", check: "✓", reading: "📖", prep: "◎", hausarbeit: "✍" };

export default function Dashboard() {
  const t = today();
  const { plan } = currentPlan(t);
  const session = getOrCreateTodaySession();
  const sp = JSON.parse(session.plan) as SessionPlan;
  const modules = listModules().filter((m) => m.id !== "gesetze");
  const prog = progressMap();
  const units = studyUnits();
  const deadlines = listDeadlines().filter((d) => !d.done && (d.end_date ?? d.date) >= t).slice(0, 4);
  const due = dueCardIds(500).length;
  const next7 = plan.days.slice(1, 8).filter((d) => d.mode !== "frei");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-ink-faint">{formatDate(t, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Guten Tag! Das steht heute an.</h1>
      </div>

      {/* Today's session */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/75">Heutige Lerneinheit · {sp.totalMinutes} Minuten</p>
              <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
                {sp.mode === "hausarbeit" ? sp.label : sp.mode === "vorbereitung" ? `Prüfungsvorbereitung: ${sp.label}` : sp.blocks.find((b) => b.kind === "new" || b.kind === "reading")?.title.replace(/^(Neuer Stoff|Skript lesen): /, "") ?? "Wiederholung & freies Üben"}
              </h2>
              {session.status === "done" && <p className="mt-2 inline-flex items-center gap-1 text-sm text-white/90"><CheckCircle2 size={16} /> Heute bereits erledigt – stark!</p>}
            </div>
            <Link href="/lerneinheit" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-lg font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50">
              <PlayCircle size={24} /> {session.status === "running" ? "Lerneinheit fortsetzen" : session.status === "done" ? "Noch einmal ansehen" : "Heutige Lerneinheit starten"}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {sp.blocks.map((b, i) => (
              <span key={i} className="rounded-full bg-white/15 px-3 py-1 text-sm">
                {BLOCK_ICON[b.kind]} {b.title.split(":")[0]} · {b.minutes} Min.
              </span>
            ))}
          </div>
        </div>
      </Card>

      {!aiAvailable() && (
        <Notice title="KI-Funktionen noch nicht aktiv">
          Lernplan, Quiz, Karteikarten und die vorbereiteten Lerneinheiten funktionieren bereits. Für den KI-Dozenten, die Bewertung freier Antworten und das Erzeugen neuer Lerneinheiten
          trage einen Claude-API-Schlüssel ein – Anleitung unter <Link className="underline" href="/einstellungen">Einstellungen</Link>.
        </Notice>
      )}

      {plan.warnings.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={20} />
              <div className="min-w-0">
                <p className="font-semibold">Ehrliche Einschätzung: Die Zeit reicht nicht für alles</p>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {plan.warnings.slice(0, 4).map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
                <Link href="/lernplan" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600">Priorisierung ansehen <ChevronRight size={16} /></Link>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle aside={<Link href="/termine" className="text-sm text-brand-600">Alle Termine</Link>}>Nächste Termine</SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {deadlines.map((d) => {
                const days = daysBetween(t, d.date);
                return (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                    <AlarmClock size={18} className={days <= 7 ? "text-bad" : "text-ink-faint"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{d.title}</p>
                      <p className="text-sm text-ink-soft">
                        {formatDate(d.date)}{d.end_date ? ` – ${formatDate(d.end_date)}` : ""} · {days <= 0 ? "läuft / heute" : `in ${days} Tagen`}
                      </p>
                    </div>
                    {d.status === "unconfirmed" ? <Badge tone="warn">unbestätigt</Badge> : <Badge tone="ok">bestätigt</Badge>}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div>
          <SectionTitle aside={<Link href="/lernplan" className="text-sm text-brand-600">Lernplan</Link>}>Die nächsten Tage</SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {next7.slice(0, 5).map((d) => (
                <li key={d.date} className="px-5 py-3.5">
                  <p className="text-sm text-ink-faint">{formatDate(d.date)}</p>
                  <p className="truncate text-[15px]">
                    {d.mode === "lernen"
                      ? d.items.map((i) => getTopic(i.unitId)?.title).filter(Boolean).join(" · ")
                      : d.mode === "hausarbeit" ? "Hausarbeit" : d.mode === "vorbereitung" ? `Vorbereitung: ${d.label}` : d.mode === "puffer" ? "Puffer / freies Üben" : "frei"}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div>
        <SectionTitle aside={<Link href="/module" className="text-sm text-brand-600">Alle Module</Link>}>Module</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {modules.map((m) => {
            const mu = units.filter((u) => u.module_id === m.id);
            const done = mu.filter((u) => prog.get(u.id)?.status === "studied").length;
            const exam = listDeadlines().find((d) => d.module_id === m.id && d.kind === "klausur");
            const left = mu.filter((u) => prog.get(u.id)?.status !== "studied").reduce((n, u) => n + u.est_minutes, 0);
            return (
              <Link key={m.id} href={`/module/${m.id}`}>
                <Card className="h-full transition hover:border-brand-200">
                  <CardBody>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{m.id}</p>
                    <p className="mt-0.5 font-semibold">{m.title}</p>
                    <div className="mt-4"><CountBar value={done} max={mu.length} label="Abschnitte erarbeitet" /></div>
                    <p className="mt-3 text-sm text-ink-soft">noch ca. {formatMinutes(left)}{exam ? ` · Klausur ${formatDate(exam.date, { day: "2-digit", month: "2-digit" })}` : ""}</p>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <Link href="/karteikarten">
        <Card className="transition hover:border-brand-200">
          <CardBody className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Layers size={20} /></span>
            <div className="flex-1">
              <p className="font-semibold">Karteikarten</p>
              <p className="text-sm text-ink-soft">{due > 0 ? `${due} Karten sind heute zur Wiederholung fällig.` : "Keine Karten fällig. Neue Karten kommen mit jeder Lerneinheit dazu."}</p>
            </div>
            <ChevronRight className="text-ink-faint" />
          </CardBody>
        </Card>
      </Link>
    </div>
  );
}
