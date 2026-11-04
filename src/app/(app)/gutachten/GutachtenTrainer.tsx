"use client";
import { useState } from "react";
import { Card, CardBody, Badge } from "@/components/ui";
import { GutachtenCase } from "@/components/learn/GutachtenCase";
import type { LessonCase } from "@/lib/learning/types";

const PARTS: [string, string, string][] = [
  ["gutachten-obersatz", "Obersatz", "Wer will was von wem woraus? Konjunktiv."],
  ["gutachten-definition", "Definition", "Tatbestandsmerkmal präzise bestimmen."],
  ["gutachten-subsumtion", "Subsumtion", "Sachverhalt unter die Definition fassen."],
  ["gutachten-ergebnis", "Ergebnis", "Obersatz im Indikativ beantworten."],
];

export function GutachtenTrainer({ cases, history }: { cases: { lessonId: string; moduleId: string; lessonTitle: string; c: LessonCase; topicId: string }[]; history: { type: string; avg: number; n: number }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const h = new Map(history.map((x) => [x.type, x]));
  if (sel !== null) {
    const c = cases[sel];
    return (
      <div className="space-y-4">
        <button onClick={() => setSel(null)} className="text-sm text-brand-600">← Fallauswahl</button>
        <GutachtenCase key={c.lessonId} lessonId={c.lessonId} c={c.c} topicId={c.topicId} />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {PARTS.map(([k, label, tip]) => {
          const x = h.get(k);
          return (
            <Card key={k}><CardBody className="p-4 sm:p-4">
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-ink-soft">{tip}</p>
              <p className="mt-2 text-sm">{x ? `${x.n} Übungen · im Schnitt ${Math.round(x.avg * 100)} % der Bewertungspunkte` : "noch nicht geübt"}</p>
            </CardBody></Card>
          );
        })}
      </div>
      <div>
        <p className="mb-2 font-semibold">Fall auswählen</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {cases.map((c, i) => (
            <button key={c.lessonId} onClick={() => setSel(i)} className="text-left">
              <Card className="h-full hover:border-brand-200"><CardBody>
                <Badge tone="brand">{c.moduleId}</Badge>
                <p className="mt-2 font-semibold">{c.c.title}</p>
                <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{c.c.facts}</p>
                <p className="mt-2 text-xs text-ink-faint">aus: {c.lessonTitle}</p>
              </CardBody></Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
