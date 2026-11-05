"use client";
import { useState } from "react";
import { Card, CardBody, cx } from "@/components/ui";
import { Markdown } from "@/components/docs/Markdown";
import { SourceChips } from "@/components/docs/SourceChips";
import { SpeechBar } from "@/components/speech/SpeechBar";
import type { LessonSection, Definition, PruefSchema } from "@/lib/learning/types";
import { NormChips } from "./NormChips";
import { extractNorms } from "@/lib/norms";

export function DepthToggle({ long, setLong }: { long: boolean; setLong: (v: boolean) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface p-0.5 text-sm">
      {[false, true].map((v) => (
        <button key={String(v)} onClick={() => setLong(v)} className={cx("rounded-lg px-3 py-1", long === v ? "bg-brand-500 text-white" : "text-ink-soft")}>
          {v ? "Ausführlich" : "Kurz"}
        </button>
      ))}
    </div>
  );
}

export function LessonSections({ sections, defaultLong = true, onAsk, lessonId, readIds }: { sections: LessonSection[]; defaultLong?: boolean; onAsk?: (s: LessonSection) => void; lessonId?: string; readIds?: string[] }) {
  const [long, setLong] = useState(defaultLong);
  const [read, setRead] = useState<Set<string>>(new Set(readIds ?? []));
  const toggleRead = (id: string) => {
    if (!lessonId) return;
    const n = new Set(read); const on = !n.has(id);
    if (on) n.add(id); else n.delete(id);
    setRead(n);
    fetch("/api/reads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId, sectionId: id, read: on }) }).catch(() => {});
  };
  const texts = sections.map((s) => `${s.title}. ${long ? s.long : s.short}`);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DepthToggle long={long} setLong={setLong} />
        <SpeechBar segments={texts} labels={sections.map((s) => s.title)} className="flex-1" />
      </div>
      {sections.map((s) => (
        <Card key={s.id}>
          <CardBody>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold">{s.title}</h3>
              {lessonId && (
                <button onClick={() => toggleRead(s.id)} className={cx("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", read.has(s.id) ? "bg-ok-soft text-ok" : "bg-canvas text-ink-soft ring-1 ring-line")}>{read.has(s.id) ? "✓ gelesen" : "als gelesen markieren"}</button>
              )}
            </div>
            <Markdown text={long ? s.long : s.short} className="mt-2" />
            {s.merksatz && <div className="mt-3 rounded-xl bg-gradient-to-r from-fuchsia-50 to-brand-50 p-3 text-[15px] font-medium text-brand-800 ring-1 ring-brand-100">💡 Merksatz: {s.merksatz}</div>}
            <div className="mt-3"><NormChips norms={s.norms?.length ? s.norms : extractNorms(s.long)} /></div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <SourceChips src={s.src} />
              {onAsk && <button onClick={() => onAsk(s)} className="text-sm font-medium text-brand-600 hover:underline">Dazu den KI-Dozenten fragen</button>}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function DefinitionList({ defs }: { defs: Definition[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {defs.map((d, i) => (
        <Card key={i}>
          <CardBody className="p-4 sm:p-5">
            <p className="font-semibold">{d.term} {d.norm && <span className="text-sm font-normal text-ink-faint">· {d.norm}</span>}</p>
            <p className="mt-1 text-[15px] leading-relaxed">{d.text}</p>
            <SourceChips src={d.src} className="mt-2" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function SchemaList({ schemas }: { schemas: PruefSchema[] }) {
  return (
    <div className="space-y-3">
      {schemas.map((s, i) => (
        <Card key={i}>
          <CardBody>
            <p className="font-semibold">{s.title}</p>
            <ol className="mt-2 space-y-1 text-[15px]">
              {s.steps.map((st, j) => <li key={j} className="whitespace-pre-wrap">{st}</li>)}
            </ol>
            <SourceChips src={s.src} className="mt-3" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
