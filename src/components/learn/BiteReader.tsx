"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lightbulb, Volume2, Square } from "lucide-react";
import { Button, Card, CardBody, cx } from "@/components/ui";
import { Markdown } from "@/components/docs/Markdown";
import { SourceChips } from "@/components/docs/SourceChips";
import { QuizItemView } from "./QuizItemView";
import { useSpeech } from "@/components/speech/useSpeech";
import type { Definition, LessonSection, QuizItem, SrcRef } from "@/lib/learning/types";
import { NormChips } from "./NormChips";
import { extractNorms } from "@/lib/norms";

/** Splits a Markdown text into bite-sized pieces of roughly 60–130 words (headings stay with their paragraph). */
export function splitBites(md: string, target = 90): string[] {
  const paras = md.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const bites: string[] = [];
  let cur: string[] = [];
  let words = 0;
  const flush = () => {
    if (cur.length) bites.push(cur.join("\n\n"));
    cur = [];
    words = 0;
  };
  for (const p of paras) {
    const w = p.split(/\s+/).length;
    const isHeading = /^#{1,6}\s/.test(p) || (/^\*\*[^*]+\*\*:?$/.test(p) && w < 12);
    if (words > 0 && words + w > target * 1.4 && !isHeading) flush();
    if (isHeading && words >= target * 0.6) flush();
    cur.push(p);
    words += w;
    if (words >= target && !isHeading) flush();
  }
  flush();
  return bites;
}

interface Bite {
  sectionTitle: string;
  sectionIndex: number;
  sectionId: string;
  text: string;
  src: SrcRef[];
  check?: QuizItem;
  last: boolean; // last bite of its section
  merksatz?: string;
  norms: string[];
}

const CLOSED = new Set(["mc-single", "mc-multi", "truefalse", "cloze", "match", "order"]);

export function BiteReader({ lessonId, sections, definitions, quiz, sessionId, topicId }: {
  lessonId: string; sections: LessonSection[]; definitions: Definition[]; quiz: QuizItem[]; sessionId?: string; topicId?: string;
}) {
  const bites = useMemo(() => {
    const out: Bite[] = [];
    const used = new Set<string>();
    sections.forEach((s, si) => {
      const parts = splitBites(s.long);
      const pages = new Set(s.src.map((x) => `${x.doc}:${x.page}`));
      const candidates = quiz.filter((q) => CLOSED.has(q.type) && q.difficulty <= 2 && (q.src ?? []).some((x) => pages.has(`${x.doc}:${x.page}`)));
      parts.forEach((text, pi) => {
        // a quick check after every 3rd bite and at the end of each section
        const wantCheck = (pi + 1) % 3 === 0 || pi === parts.length - 1;
        const check = wantCheck ? candidates.find((q) => !used.has(q.id)) : undefined;
        if (check) used.add(check.id);
        const last = pi === parts.length - 1;
        out.push({ sectionTitle: s.title, sectionIndex: si, sectionId: s.id, text, src: s.src, check, last, merksatz: last ? s.merksatz : undefined, norms: last ? (s.norms?.length ? s.norms : extractNorms(s.long)) : [] });
      });
    });
    return out;
  }, [sections, quiz]);
  const [i, setI] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const speech = useSpeech();
  const b = bites[Math.min(i, bites.length - 1)];
  if (!b) return null;
  const merke = definitions.find((d) => d.term.length > 3 && b.text.toLowerCase().includes(d.term.toLowerCase().split(/[ (]/)[0]));
  const markRead = (bite: Bite) => {
    if (bite.last) fetch("/api/reads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId, sectionId: bite.sectionId }) }).catch(() => {});
  };
  const go = (n: number) => {
    if (n > i) markRead(b);
    speech.stop(); setShowCheck(false); setI(Math.max(0, Math.min(bites.length - 1, n))); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => (b.check && !showCheck ? setShowCheck(true) : go(i + 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-0.5">
          {bites.map((_, k) => <span key={k} className={cx("h-1.5 flex-1 rounded-full", k < i ? "bg-ok" : k === i ? "bg-brand-500" : "bg-brand-100")} />)}
        </div>
        <span className="text-sm tabular-nums text-ink-faint">Häppchen {i + 1} von {bites.length}</span>
      </div>
      <Card>
        <CardBody>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{b.sectionTitle}</p>
            {speech.supported && (
              speech.speaking
                ? <button onClick={speech.stop} className="inline-flex items-center gap-1 text-sm text-brand-600"><Square size={14} /> Stopp</button>
                : <button onClick={() => speech.speak(b.text.split(/\n{2,}/))} className="inline-flex items-center gap-1 text-sm text-brand-600"><Volume2 size={15} /> Vorlesen</button>
            )}
          </div>
          {!showCheck ? (
            <>
              <Markdown text={b.text} />
              {merke && (
                <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-warn-soft p-3 text-[15px] text-amber-900">
                  <Lightbulb size={18} className="mt-0.5 shrink-0" />
                  <p><span className="font-semibold">Merke – {merke.term}{merke.norm ? ` (${merke.norm})` : ""}:</span> {merke.text}</p>
                </div>
              )}
              {b.merksatz && (
                <div className="mt-4 rounded-xl bg-gradient-to-r from-fuchsia-50 to-brand-50 p-3 text-[15px] font-medium text-brand-800 ring-1 ring-brand-100">💡 Merksatz: {b.merksatz}</div>
              )}
              {b.norms.length > 0 && <div className="mt-3"><NormChips norms={b.norms} /></div>}
              <SourceChips src={b.src} className="mt-3" />
            </>
          ) : (
            <div>
              <p className="mb-3 text-sm font-medium text-brand-700">Kurz gecheckt – hast du es behalten?</p>
              <QuizItemView key={b.check!.id} item={b.check!} refId={`${lessonId}::${b.check!.id}`} sessionId={sessionId} topicId={topicId} compact />
            </div>
          )}
        </CardBody>
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => (showCheck ? setShowCheck(false) : go(i - 1))} disabled={i === 0 && !showCheck}><ChevronLeft size={16} /> Zurück</Button>
        {i < bites.length - 1 || (b.check && !showCheck) ? (
          <Button onClick={next}>{b.check && !showCheck ? "Weiter – kurze Frage" : "Nächstes Häppchen"} <ChevronRight size={16} /></Button>
        ) : (
          <Button variant="soft" onClick={() => markRead(b)}>✓ Alle Häppchen geschafft</Button>
        )}
      </div>
    </div>
  );
}
