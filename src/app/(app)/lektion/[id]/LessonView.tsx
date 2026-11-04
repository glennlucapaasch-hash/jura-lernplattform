"use client";
import { useState } from "react";
import { Card, CardBody, PageHeader, cx } from "@/components/ui";
import type { LessonPack, LessonSection } from "@/lib/learning/types";
import { LessonSections, DefinitionList, SchemaList } from "@/components/learn/LessonSections";
import { QuizItemView } from "@/components/learn/QuizItemView";
import { GutachtenCase } from "@/components/learn/GutachtenCase";
import { TutorChat } from "@/components/tutor/TutorChat";
import { SourceChips } from "@/components/docs/SourceChips";
import { BiteReader } from "@/components/learn/BiteReader";

const TABS = ["Häppchen", "Erklärung", "Definitionen", "Schemata", "Quiz", "Gutachtenfall", "Karteikarten", "KI-Dozent"] as const;

export function LessonView({ lesson, moduleTitle, aiReady }: { lesson: LessonPack; moduleTitle: string; aiReady: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(lesson.kind === "drill" ? "Quiz" : "Häppchen");
  const [ask, setAsk] = useState<LessonSection | null>(null);
  const [qi, setQi] = useState(0);
  return (
    <div className="space-y-6">
      <PageHeader title={lesson.title} subtitle={`${moduleTitle}${lesson.ke ? ` · Kurseinheit ${lesson.ke}` : ""}`} />
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.filter((t) => (t !== "Gutachtenfall" || lesson.case) && (t !== "Schemata" || lesson.schemas.length)).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("shrink-0 rounded-full px-4 py-1.5 text-sm font-medium", tab === t ? "bg-brand-500 text-white" : "bg-surface text-ink-soft border border-line")}>{t}</button>
        ))}
      </div>
      {tab === "Häppchen" && <BiteReader lessonId={lesson.id} sections={lesson.sections} definitions={lesson.definitions} quiz={lesson.quiz} topicId={lesson.topicIds[0]} />}
      {tab === "Erklärung" && <LessonSections sections={lesson.sections} onAsk={(s) => { setAsk(s); setTab("KI-Dozent"); }} />}
      {tab === "Definitionen" && <DefinitionList defs={lesson.definitions} />}
      {tab === "Schemata" && <SchemaList schemas={lesson.schemas} />}
      {tab === "Quiz" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {lesson.quiz.map((q, i) => <button key={q.id} onClick={() => setQi(i)} className={cx("h-8 w-8 rounded-lg text-sm", i === qi ? "bg-brand-500 text-white" : "bg-surface border border-line")}>{i + 1}</button>)}
          </div>
          <Card><CardBody><QuizItemView key={lesson.quiz[qi].id} item={lesson.quiz[qi]} refId={`${lesson.id}::${lesson.quiz[qi].id}`} /></CardBody></Card>
        </div>
      )}
      {tab === "Gutachtenfall" && lesson.case && <GutachtenCase lessonId={lesson.id} c={lesson.case} />}
      {tab === "Karteikarten" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {lesson.flashcards.map((c, i) => (
            <Card key={i}><CardBody className="p-4 sm:p-5"><p className="font-medium">{c.front}</p><p className="mt-2 text-[15px] text-ink-soft">{c.back}</p><SourceChips src={c.src} className="mt-2" /></CardBody></Card>
          ))}
        </div>
      )}
      {tab === "KI-Dozent" && (
        <TutorChat aiReady={aiReady} ctx={{ moduleId: lesson.moduleId, topicId: lesson.topicIds[0], lessonTitle: lesson.title, excerpt: ask?.long }}
          starter={ask ? `Ich habe eine Frage zum Abschnitt „${ask.title}“: ` : undefined} />
      )}
    </div>
  );
}
