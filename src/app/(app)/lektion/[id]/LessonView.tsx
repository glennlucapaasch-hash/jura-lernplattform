"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card, CardBody, PageHeader, cx } from "@/components/ui";
import type { LessonPack, LessonSection } from "@/lib/learning/types";
import { LessonSections, DefinitionList, SchemaList } from "@/components/learn/LessonSections";
import { QuizItemView } from "@/components/learn/QuizItemView";
import { GutachtenCase } from "@/components/learn/GutachtenCase";
import { TutorChat } from "@/components/tutor/TutorChat";
import { SourceChips } from "@/components/docs/SourceChips";
import { BiteReader } from "@/components/learn/BiteReader";
import { NormChips } from "@/components/learn/NormChips";
import { extractNorms, normUrl } from "@/lib/norms";
import { moduleTheme } from "@/components/ui/theme";

const TABS = ["Häppchen", "Erklärung", "Gesetze", "Definitionen", "Schemata", "Quiz", "Gutachtenfall", "Karteikarten", "KI-Dozent"] as const;
type Tab = (typeof TABS)[number];

export function LessonView({ lesson, moduleTitle, aiReady, readIds, results, initialTab }: {
  lesson: LessonPack; moduleTitle: string; aiReady: boolean; readIds: string[]; results: Record<string, boolean>; initialTab?: string;
}) {
  const start = (TABS as readonly string[]).includes(initialTab ?? "") ? (initialTab as Tab) : lesson.kind === "drill" ? "Quiz" : "Häppchen";
  const [tab, setTab] = useState<Tab>(start);
  const [ask, setAsk] = useState<LessonSection | null>(null);
  const [qi, setQi] = useState(0);
  const [res, setRes] = useState<Record<string, boolean>>(results);
  const th = moduleTheme(lesson.moduleId);
  const solved = lesson.quiz.filter((q) => res[q.id] === true).length;
  const norms = useMemo(() => {
    if (lesson.kernnormen?.length) return lesson.kernnormen;
    const all = lesson.sections.flatMap((s) => (s.norms?.length ? s.norms : extractNorms(s.long)));
    return [...new Set(all)].map((n) => ({ norm: n, inhalt: "" }));
  }, [lesson]);
  const visible = TABS.filter((t) => (t !== "Gutachtenfall" || lesson.case) && (t !== "Schemata" || lesson.schemas.length) && (t !== "Definitionen" || lesson.definitions.length) && (t !== "Karteikarten" || lesson.flashcards.length) && (t !== "Gesetze" || norms.length));
  const q = lesson.quiz[qi];
  return (
    <div className="space-y-6">
      <div className={cx("rounded-2xl p-5 text-white sm:p-6", th.gradient)}>
        <p className="text-sm text-white/80">{moduleTitle}{lesson.ke ? ` · Kurseinheit ${lesson.ke}` : ""}{lesson.kind === "extra" ? " · Vertiefung" : ""}</p>
        <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{lesson.title}</h1>
        <p className="mt-2 text-sm text-white/85">Gelesen: {lesson.sections.filter((s) => readIds.includes(s.id)).length}/{lesson.sections.length} Abschnitte · Quiz: {solved}/{lesson.quiz.length} gelöst</p>
      </div>
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {visible.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("shrink-0 rounded-full px-4 py-1.5 text-sm font-medium", tab === t ? th.solid : "border border-line bg-surface text-ink-soft")}>{t}</button>
        ))}
      </div>
      {tab === "Häppchen" && <BiteReader lessonId={lesson.id} sections={lesson.sections} definitions={lesson.definitions} quiz={lesson.quiz} topicId={lesson.topicIds[0]} />}
      {tab === "Erklärung" && <LessonSections sections={lesson.sections} lessonId={lesson.id} readIds={readIds} onAsk={(s) => { setAsk(s); setTab("KI-Dozent"); }} />}
      {tab === "Gesetze" && (
        <Card><CardBody>
          <p className="font-semibold">Diese Normen solltest du für diese Einheit im Gesetz lesen</p>
          <p className="mt-1 text-sm text-ink-soft">Tipp: Norm laut lesen, Tatbestand und Rechtsfolge markieren, dann den Merksatz wiederholen.</p>
          <ul className="mt-4 divide-y divide-line">
            {norms.map((n) => {
              const url = normUrl(n.norm);
              return (
                <li key={n.norm} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-3">
                  {url ? <a href={url} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2">{n.norm}</a> : <span className="shrink-0 font-semibold text-emerald-700">{n.norm}</span>}
                  {n.inhalt && <span className="text-[15px] text-ink-soft">{n.inhalt}</span>}
                </li>
              );
            })}
          </ul>
        </CardBody></Card>
      )}
      {tab === "Definitionen" && <DefinitionList defs={lesson.definitions} />}
      {tab === "Schemata" && <SchemaList schemas={lesson.schemas} />}
      {tab === "Quiz" && q && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {lesson.quiz.map((x, i) => (
              <button key={x.id} onClick={() => setQi(i)} title={res[x.id] === true ? "gelöst" : res[x.id] === false ? "noch nicht gelöst" : "offen"}
                className={cx("h-8 w-8 rounded-lg text-sm font-medium", i === qi ? th.solid : res[x.id] === true ? "bg-ok-soft text-ok" : res[x.id] === false ? "bg-bad-soft text-bad" : "border border-line bg-surface")}>{i + 1}</button>
            ))}
          </div>
          <p className="text-sm text-ink-soft">{solved} von {lesson.quiz.length} gelöst · grün = gelöst, rot = noch einmal üben</p>
          <Card><CardBody>
            <QuizItemView key={q.id} item={q} refId={`${lesson.id}::${q.id}`} topicId={lesson.topicIds[0]} onDone={(r) => setRes((o) => ({ ...o, [q.id]: r.score >= 0.8 }))} />
          </CardBody></Card>
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setQi(Math.max(0, qi - 1))} disabled={qi === 0}><ChevronLeft size={16} /> Zurück</Button>
            <span className="text-sm text-ink-faint">Frage {qi + 1} von {lesson.quiz.length}</span>
            {qi < lesson.quiz.length - 1 ? (
              <Button onClick={() => setQi(qi + 1)}>Weiter <ChevronRight size={16} /></Button>
            ) : (
              <Button onClick={() => { const open = lesson.quiz.findIndex((x) => res[x.id] !== true); setQi(open >= 0 ? open : 0); }}>{solved === lesson.quiz.length ? "Von vorn" : "Zu offenen Fragen"}</Button>
            )}
          </div>
        </div>
      )}
      {tab === "Gutachtenfall" && lesson.case && <GutachtenCase lessonId={lesson.id} c={lesson.case} />}
      {tab === "Karteikarten" && (
        <div className="space-y-3">
          <Link href="/karteikarten" className="inline-block text-sm font-medium text-brand-600">Fällige Karten wiederholen →</Link>
          <div className="grid gap-3 sm:grid-cols-2">
            {lesson.flashcards.map((c, i) => (
              <Card key={i}><CardBody className="p-4 sm:p-5"><p className="font-medium">{c.front}</p><p className="mt-2 text-[15px] text-ink-soft">{c.back}</p><SourceChips src={c.src} className="mt-2" /></CardBody></Card>
            ))}
          </div>
        </div>
      )}
      {tab === "KI-Dozent" && (
        <TutorChat aiReady={aiReady} ctx={{ moduleId: lesson.moduleId, topicId: lesson.topicIds[0], lessonTitle: lesson.title, excerpt: ask?.long }}
          starter={ask ? `Ich habe eine Frage zum Abschnitt „${ask.title}“: ` : undefined} />
      )}
      {/* Next step suggestion */}
      <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
        {visible.indexOf(tab) > 0 ? <Button variant="ghost" onClick={() => setTab(visible[visible.indexOf(tab) - 1])}><ChevronLeft size={16} /> {visible[visible.indexOf(tab) - 1]}</Button> : <span />}
        {visible.indexOf(tab) < visible.length - 1 && <Button variant="soft" onClick={() => { setTab(visible[visible.indexOf(tab) + 1]); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Weiter: {visible[visible.indexOf(tab) + 1]} <ChevronRight size={16} /></Button>}
      </div>
    </div>
  );
}
