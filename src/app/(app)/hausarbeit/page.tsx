import Link from "next/link";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Card, CardBody, PageHeader, Notice, Badge, SectionTitle } from "@/components/ui";
import { getLesson, today } from "@/lib/repo/study";
import { getSetting } from "@/lib/db";
import { addDays, daysBetween } from "@/lib/learning/planner";
import { StepList } from "../einsendeaufgaben/StepList";

interface Ha {
  id: string; title: string; period: { start: string; end: string }; facts: string[];
  prep: { id: string; label: string; by: string; lesson?: string }[];
  during: { id: string; day: number; label: string; lesson?: string }[];
  tips: string[]; lessons: string[];
}

export default function HausarbeitPage() {
  const h = JSON.parse(readFileSync(path.join(process.cwd(), "content", "hausarbeit.json"), "utf8")) as Ha;
  const t = today();
  const progress = getSetting<Record<string, string[]>>("eaProgress", {});
  const lt = (id?: string) => (id ? getLesson(id)?.title : undefined);
  const toStart = daysBetween(t, h.period.start);
  return (
    <div className="space-y-6">
      <PageHeader title={h.title} subtitle="Was du wann vorbereitest – und wie du die 11 Tage sinnvoll nutzt" />
      <div className="flex flex-wrap gap-2">
        <Badge tone="ok">Bearbeitung 05.–15.02.2027 · bestätigt</Badge>
        <Badge tone={toStart <= 14 ? "warn" : "brand"}>{toStart > 0 ? `beginnt in ${toStart} Tagen` : "läuft / vorbei"}</Badge>
      </div>
      <Card><CardBody><ul className="list-disc space-y-1 pl-5 text-[15px]">{h.facts.map((f) => <li key={f}>{f}</li>)}</ul></CardBody></Card>
      <div>
        <SectionTitle>Vorbereitung bis Februar</SectionTitle>
        <Card><CardBody>
          <StepList id={`${h.id}-prep`} initial={progress[`${h.id}-prep`] ?? []} steps={h.prep.map((s) => ({ id: s.id, label: s.label, date: s.by, lesson: s.lesson, lessonTitle: lt(s.lesson) }))} />
        </CardBody></Card>
      </div>
      <div>
        <SectionTitle>Die 11 Bearbeitungstage</SectionTitle>
        <Card><CardBody>
          <StepList id={`${h.id}-during`} initial={progress[`${h.id}-during`] ?? []} steps={h.during.map((s) => ({ id: s.id, label: `Tag ${s.day}: ${s.label}`, date: addDays(h.period.start, s.day - 1), lesson: s.lesson, lessonTitle: lt(s.lesson) }))} />
        </CardBody></Card>
      </div>
      <div>
        <SectionTitle>So bestehst du sicher</SectionTitle>
        <Card><CardBody><ul className="space-y-2 text-[15px]">{h.tips.map((x) => <li key={x}>✔️ {x}</li>)}</ul></CardBody></Card>
      </div>
      <div>
        <SectionTitle>Passende Lerneinheiten</SectionTitle>
        <div className="flex flex-wrap gap-2">{h.lessons.map((l) => <Link key={l} href={`/lektion/${l}`} className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">{lt(l)}</Link>)}</div>
      </div>
      <Notice tone="warn">Die Hausarbeit ist eine Prüfungsleistung: Die App hilft bei Methode, Planung und Wiederholung, schreibt aber keine Lösung.</Notice>
    </div>
  );
}
