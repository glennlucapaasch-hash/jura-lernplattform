import Link from "next/link";
import { Card, CardBody, PageHeader, SectionTitle, CountBar, Badge, formatDate } from "@/components/ui";
import { listModules, studyUnits, progressMap, masteryByTopic, listTopics } from "@/lib/repo/study";
import { attemptsByWeek, levelTotals, cardReviewsByWeek, gutachtenQuality, mistakeStats, studyMinutesByWeek } from "@/lib/repo/stats";
import { listExams } from "@/lib/repo/exams";
import { LEVELS, LEVEL_LABEL } from "@/lib/learning/mastery";
import { AttemptsChart, SimpleBars } from "./Charts";

const STAGES = ["neu", "begonnen", "gefestigt", "sicher"] as const;
const PART: Record<string, string> = { "gutachten-obersatz": "Obersatz", "gutachten-definition": "Definition", "gutachten-subsumtion": "Subsumtion", "gutachten-ergebnis": "Ergebnis" };

export default function ProgressPage() {
  const prog = progressMap();
  const mastery = masteryByTopic();
  const lt = new Map(levelTotals().map((l) => [l.level, l]));
  const gq = gutachtenQuality();
  const ms = mistakeStats();
  const exams = listExams().filter((e) => e.evaluation);
  const topics = listTopics();
  const review = [...mastery.entries()].filter(([, m]) => m.needsReview).map(([id]) => topics.find((t) => t.id === id)).filter(Boolean);

  return (
    <div className="space-y-8">
      <PageHeader title="Lernfortschritt" subtitle="Alle Angaben beruhen auf deinen tatsächlich bearbeiteten Aufgaben – es gibt bewusst keine geschätzte „Prüfungssicherheit“." />

      <div>
        <SectionTitle>Stoff je Modul</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {listModules().filter((m) => m.id !== "gesetze").map((m) => {
            const u = studyUnits(m.id);
            const studied = u.filter((x) => prog.get(x.id)?.status === "studied").length;
            const learning = u.filter((x) => prog.get(x.id)?.status === "learning").length;
            const stage = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<string, number>;
            for (const t of topics.filter((t) => t.module_id === m.id && t.level === 1 && t.kind === "study")) stage[mastery.get(t.id)?.stage ?? "neu"]++;
            return (
              <Card key={m.id}><CardBody>
                <p className="font-semibold">{m.short}</p>
                <div className="mt-3 space-y-2">
                  <CountBar value={studied} max={u.length} label="erarbeitet" tone="ok" />
                  <p className="text-sm text-ink-soft">{learning} in Arbeit · {u.length - studied - learning} offen</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">{STAGES.map((s) => <Badge key={s} tone={s === "sicher" ? "ok" : s === "gefestigt" ? "brand" : "neutral"}>{s}: {stage[s]}</Badge>)}</div>
              </CardBody></Card>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-faint">Stufen je Paragraph: <b>begonnen</b> = erste Aufgaben bearbeitet · <b>gefestigt</b> = Wiedererkennen/Abrufen und Verstehen/Anwenden belegt · <b>sicher</b> = zusätzlich Anwendung auf Fälle und eigenes Formulieren belegt.</p>
      </div>

      <div>
        <SectionTitle>Kompetenzstufen</SectionTitle>
        <Card><CardBody>
          <div className="grid gap-3 sm:grid-cols-5">
            {LEVELS.map((l) => {
              const x = lt.get(l);
              return (
                <div key={l} className="rounded-xl bg-canvas p-3">
                  <p className="text-sm font-medium">{LEVEL_LABEL[l]}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{x ? `${x.ok}/${x.n}` : "–"}</p>
                  <p className="text-xs text-ink-faint">{x ? `richtig · ${x.hinted} mit Hinweis` : "noch keine Aufgaben"}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5"><AttemptsChart data={attemptsByWeek()} /></div>
        </CardBody></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle>Lernzeit pro Woche</SectionTitle>
          <Card><CardBody><SimpleBars data={studyMinutesByWeek()} keys={["minutes"]} names={["Minuten"]} colors={["#3987e5"]} unit="Min." /></CardBody></Card>
        </div>
        <div>
          <SectionTitle>Definitionen & Karteikarten</SectionTitle>
          <Card><CardBody><SimpleBars data={cardReviewsByWeek()} keys={["gewusst", "nichtGewusst"]} names={["gewusst", "nicht gewusst"]} colors={["#3987e5", "#eb6834"]} /></CardBody></Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle>Gutachtenstil</SectionTitle>
          <Card><CardBody>
            {gq.length === 0 ? <p className="text-sm text-ink-soft">Noch keine Gutachten-Übungen. <Link className="text-brand-600" href="/gutachten">Jetzt üben</Link></p> : (
              <table className="w-full text-sm"><thead><tr className="text-ink-faint"><th className="text-left font-normal">Bestandteil</th><th className="text-right font-normal">Übungen</th><th className="text-right font-normal">Ø Bewertungspunkte</th><th className="text-right font-normal">letzte 14 Tage</th></tr></thead>
                <tbody>{gq.map((g) => <tr key={g.type}><td className="py-1">{PART[g.type] ?? g.type}</td><td className="text-right tabular-nums">{g.n}</td><td className="text-right tabular-nums">{Math.round(g.avg * 100)} %</td><td className="text-right tabular-nums">{g.recent != null ? `${Math.round(g.recent * 100)} %` : "–"}</td></tr>)}</tbody></table>
            )}
          </CardBody></Card>
        </div>
        <div>
          <SectionTitle>Klausurübungen</SectionTitle>
          <Card><CardBody>
            {exams.length === 0 ? <p className="text-sm text-ink-soft">Noch keine ausgewerteten Klausuren.</p> : (
              <ul className="space-y-1 text-sm">{exams.map((e) => { const ev = JSON.parse(e.evaluation!); return <li key={e.id}><Link href={`/klausur/${e.id}`} className="flex justify-between gap-2 hover:text-brand-700"><span className="truncate">{formatDate(e.created_at, { day: "2-digit", month: "2-digit" })} · {e.title}</span><span className="tabular-nums">{Math.round((ev.rubricScore ?? 0) * 100)} % der Lösungspunkte{ev.self ? " (selbst)" : ""}</span></Link></li>; })}</ul>
            )}
            <p className="mt-2 text-xs text-ink-faint">KI-Auswertungen sind keine offizielle Benotung.</p>
          </CardBody></Card>
        </div>
      </div>

      <div id="fehler">
        <SectionTitle>Fehleranalyse</SectionTitle>
        <Card><CardBody>
          <div className="mb-3 flex flex-wrap gap-2">{["inhaltlich", "methodisch", "sprachlich"].map((c) => <Badge key={c} tone={c === "inhaltlich" ? "bad" : c === "methodisch" ? "warn" : "brand"}>{c}: {ms.byCat.find((x) => x.category === c)?.n ?? 0}</Badge>)}</div>
          {ms.recent.length === 0 ? <p className="text-sm text-ink-soft">Noch keine Fehler dokumentiert.</p> : (
            <ul className="space-y-1.5 text-sm">{ms.recent.map((m) => <li key={m.id} className="flex gap-2"><span className="w-20 shrink-0 text-ink-faint">{formatDate(m.created_at, { day: "2-digit", month: "2-digit" })}</span><span className="w-24 shrink-0 text-ink-soft">{m.category}</span><span>{m.description}</span></li>)}</ul>
          )}
        </CardBody></Card>
      </div>

      {review.length > 0 && (
        <div>
          <SectionTitle>Wiederholungsbedarf</SectionTitle>
          <Card><CardBody><ul className="space-y-1 text-[15px]">{review.map((t) => <li key={t!.id}>{t!.marker} {t!.title}</li>)}</ul><p className="mt-2 text-xs text-ink-faint">Diese Themen tauchen automatisch im Wiederholungsblock deiner Lerneinheiten auf.</p></CardBody></Card>
        </div>
      )}
    </div>
  );
}
