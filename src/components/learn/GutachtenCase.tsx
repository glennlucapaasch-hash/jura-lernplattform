"use client";
import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardBody, cx } from "@/components/ui";
import type { LessonCase } from "@/lib/learning/types";
import { OpenAnswer, type ItemResult } from "./QuizItemView";
import { SourceChips } from "@/components/docs/SourceChips";

const PART_LABEL = { obersatz: "1. Obersatz", definition: "2. Definition", subsumtion: "3. Subsumtion", ergebnis: "4. Ergebnis" } as const;
const PART_TIP = {
  obersatz: "Wer will was von wem woraus? Im Konjunktiv: „A könnte gegen B einen Anspruch auf … aus § … haben.“",
  definition: "Bestimme das maßgebliche Tatbestandsmerkmal präzise – so, wie es im Skript definiert wird.",
  subsumtion: "Ordne die Tatsachen des Sachverhalts den Merkmalen der Definition zu. Keine neuen Tatsachen erfinden.",
  ergebnis: "Beantworte den Obersatz im Indikativ: „Somit hat A … / Folglich liegt … (nicht) vor.“",
} as const;

/** Step-by-step Gutachtenstil training: Obersatz → Definition → Subsumtion → Ergebnis. */
export function GutachtenCase({ lessonId, c, sessionId, topicId, onDone }: { lessonId: string; c: LessonCase; sessionId?: string; topicId?: string; onDone?: (scores: number[]) => void }) {
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<(ItemResult | null)[]>(c.steps.map(() => null));
  function done(i: number, r: ItemResult) {
    const next = [...results];
    next[i] = r;
    setResults(next);
    if (next.every(Boolean)) onDone?.(next.map((x) => x!.score));
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Sachverhalt</p>
          <h3 className="mt-1 font-semibold">{c.title}</h3>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{c.facts}</p>
          <p className="mt-3 rounded-xl bg-brand-50 p-3 text-[15px] font-medium text-brand-800">Fallfrage: {c.question}</p>
          <SourceChips src={c.src} className="mt-3" />
        </CardBody>
      </Card>
      <div className="flex flex-wrap gap-2">
        {c.steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm", i === step ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-soft")}>
            {results[i] ? <CheckCircle2 size={15} className="text-ok" /> : <Circle size={15} />} {PART_LABEL[s.part]}
          </button>
        ))}
      </div>
      {c.steps.map((s, i) => (
        <div key={i} className={i === step ? "" : "hidden"}>
          <Card>
            <CardBody>
              <p className="font-semibold">{PART_LABEL[s.part]}</p>
              <p className="mt-1 text-sm text-ink-soft">{PART_TIP[s.part]}</p>
              <div className="mt-4">
                <OpenAnswer prompt={s.prompt} hints={s.hints} gradeBody={{ lessonId, casePart: i, sessionId, topicId }}
                  placeholder={s.part === "obersatz" ? "A könnte gegen B einen Anspruch auf … aus … haben." : undefined}
                  onDone={(r) => { done(i, r); if (i < c.steps.length - 1) setTimeout(() => setStep(i + 1), 600); }} />
              </div>
            </CardBody>
          </Card>
        </div>
      ))}
    </div>
  );
}
