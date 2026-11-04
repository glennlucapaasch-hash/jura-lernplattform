import Link from "next/link";
import { readFileSync } from "node:fs";
import path from "node:path";
import { BookOpen, FileText } from "lucide-react";
import { Card, CardBody, PageHeader, Badge, Notice, formatDate } from "@/components/ui";
import { listDeadlines, getLesson, today } from "@/lib/repo/study";
import { listDocuments } from "@/lib/repo/documents";
import { getSetting } from "@/lib/db";
import { addDays, daysBetween } from "@/lib/learning/planner";
import { StepList } from "./StepList";

interface Guide {
  rules: string[];
  assignments: { id: string; deadlineId: string; moduleId: string; title: string; scope: string; parts: { label: string; points: number; topic: string; lessons: string[] }[]; method: string[]; hints: string }[];
  steps: { id: string; label: string; daysBefore: number; lesson?: string }[];
}

export default function EaPage() {
  const g = JSON.parse(readFileSync(path.join(process.cwd(), "content", "einsendeaufgaben.json"), "utf8")) as Guide;
  const dls = new Map(listDeadlines().map((d) => [d.id, d]));
  const t = today();
  const progress = getSetting<Record<string, string[]>>("eaProgress", {});
  const eaDocs = listDocuments().filter((d) => /Einsendeaufgabe/i.test(d.title));
  const lessonTitle = (id: string) => getLesson(id)?.title ?? id;
  return (
    <div className="space-y-6">
      <PageHeader title="Einsendeaufgaben" subtitle="Frist, Formvorgaben, passende Lerneinheiten und ein Arbeitsplan zum Abhaken" />
      <Notice tone="warn" title="Selbständig bearbeiten">
        Die App hilft dir beim Vorbereiten und Strukturieren, schreibt aber keine Lösung. Mit der Abgabe versicherst du, die Einsendearbeit selbständig bearbeitet zu haben.
      </Notice>
      {g.assignments.map((a) => {
        const d = dls.get(a.deadlineId);
        const due = d?.date;
        const left = due ? daysBetween(t, due) : null;
        const doc = eaDocs.find((x) => x.module_id === a.moduleId && (a.id.endsWith("-3") ? /KE 3\)|KE 03/.test(x.title + x.filename) || x.ke === 3 : x.ke === 8));
        return (
          <Card key={a.id}>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{a.title}</p>
                  <p className="text-sm text-ink-soft">Stoff: {a.scope}{due ? ` · Abgabe bis ${formatDate(due)}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  {left != null && <Badge tone={left <= 3 ? "bad" : left <= 10 ? "warn" : "brand"}>{left < 0 ? "vorbei" : left === 0 ? "heute" : `noch ${left} Tage`}</Badge>}
                  {d && <Badge tone={d.status === "confirmed" ? "ok" : "warn"}>{d.status === "confirmed" ? "Termin bestätigt" : "Termin unbestätigt"}</Badge>}
                </div>
              </div>
              {doc ? (
                <Link href={`/bibliothek/${doc.id}`} className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"><FileText size={16} /> Aufgabentext öffnen</Link>
              ) : (
                <p className="text-sm text-ink-soft">Tipp: Lade das Aufgabenblatt in der <Link className="text-brand-600 underline" href="/bibliothek">Bibliothek</Link> hoch, dann ist es hier direkt verlinkt.</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {a.parts.map((p) => (
                  <div key={p.label} className="rounded-xl border border-line p-3">
                    <p className="font-medium">{p.label} <span className="text-sm font-normal text-ink-faint">· {p.points} Punkte</span></p>
                    <p className="text-sm text-ink-soft">{p.topic}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Vorher sicher beherrschen</p>
                    <ul className="mt-1 space-y-1 text-sm">{p.lessons.map((l) => <li key={l}><Link className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={`/lektion/${l}`}><BookOpen size={13} /> {lessonTitle(l)}</Link></li>)}</ul>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <p className="font-medium">Methodik</p>
                <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{a.method.map((l) => <li key={l}><Link className="text-brand-600 hover:underline" href={`/lektion/${l}`}>{lessonTitle(l)}</Link></li>)}</ul>
              </div>
              <p className="rounded-xl bg-canvas p-3 text-sm">💡 {a.hints}</p>
              <div>
                <p className="mb-2 font-medium">Arbeitsplan</p>
                <StepList id={a.id} initial={progress[a.id] ?? []} steps={g.steps.map((s) => ({ ...s, date: due ? addDays(due, -s.daysBefore) : null, lessonTitle: s.lesson ? lessonTitle(s.lesson) : undefined }))} />
              </div>
            </CardBody>
          </Card>
        );
      })}
      <Card><CardBody>
        <p className="mb-2 font-semibold">Formvorgaben (für alle Einsendearbeiten)</p>
        <ul className="list-disc space-y-1 pl-5 text-[15px]">{g.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </CardBody></Card>
    </div>
  );
}
