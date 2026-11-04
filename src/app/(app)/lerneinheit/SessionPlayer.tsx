"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock, CheckCircle2, MessageCircle, X, Sparkles } from "lucide-react";
import { Button, Card, CardBody, Badge, Notice, cx } from "@/components/ui";
import type { SessionPlan, SessionBlock } from "@/lib/learning/session";
import type { LessonPack, QuizItem } from "@/lib/learning/types";
import { LessonSections, DefinitionList, SchemaList } from "@/components/learn/LessonSections";
import { QuizItemView, type ItemResult } from "@/components/learn/QuizItemView";
import { GutachtenCase } from "@/components/learn/GutachtenCase";
import { FlashcardReview, type ReviewCard } from "@/components/learn/FlashcardReview";
import { TutorChat } from "@/components/tutor/TutorChat";
import { PdfPages } from "@/components/docs/PdfViewer";

const KIND_LABEL: Record<string, string> = { review: "Wiederholung", new: "Neuer Stoff", exercise: "Übungen", application: "Anwendung", check: "Lernkontrolle", reading: "Skript", prep: "Vorbereitung", hausarbeit: "Hausarbeit" };

export function SessionPlayer({ session, plan, lessons, items, cards, readingDocId, unit, aiReady }: {
  session: { id: string; status: string; log: { block: number; minutes: number }[] };
  plan: SessionPlan;
  lessons: Record<string, LessonPack>;
  items: Record<string, { lessonId: string; item: QuizItem }>;
  cards: ReviewCard[];
  readingDocId?: string;
  unit?: { id: string; title: string; moduleId: string };
  aiReady: boolean;
}) {
  const doneBlocks = useMemo(() => new Set(session.log.map((l) => l.block)), [session.log]);
  const firstOpen = plan.blocks.findIndex((_, i) => !doneBlocks.has(i));
  const [idx, setIdx] = useState(firstOpen < 0 ? plan.blocks.length : firstOpen);
  const [completed, setCompleted] = useState<Set<number>>(doneBlocks);
  const [started, setStarted] = useState(session.status !== "planned");
  const [elapsed, setElapsed] = useState(0); // seconds in current block
  const [tutorOpen, setTutorOpen] = useState(false);
  const [finished, setFinished] = useState(session.status === "done");
  const [results, setResults] = useState<number[]>([]);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!started || finished) return;
    tick.current = setInterval(() => { if (document.visibilityState === "visible") setElapsed((e) => e + 1); }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [started, finished, idx]);

  const post = (body: object) => fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: session.id, ...body }) });

  async function start() { await post({ action: "start" }); setStarted(true); }
  async function completeBlock() {
    await post({ action: "log", block: idx, minutes: Math.max(1, Math.round(elapsed / 60)) });
    setCompleted(new Set([...completed, idx]));
    setElapsed(0);
    setIdx(idx + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function finish(unitStudied: boolean) { await post({ action: "finish", unitStudied }); setFinished(true); }
  const note = (r: ItemResult) => setResults((x) => [...x, r.score]);

  const block: SessionBlock | undefined = plan.blocks[idx];
  const lesson = block?.lessonId ? lessons[block.lessonId] : undefined;
  const totalPlanned = plan.blocks.reduce((n, b) => n + b.minutes, 0);
  const over = block ? elapsed / 60 > block.minutes * 1.3 : false;

  if (!started)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Heutige Lerneinheit</h1>
        {unit && <p className="text-ink-soft">Thema: <span className="font-medium text-ink">{unit.title}</span></p>}
        <Card>
          <ul className="divide-y divide-line">
            {plan.blocks.map((b, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">{b.title}</p>
                  {b.note && <p className="text-sm text-ink-soft">{b.note}</p>}
                </div>
                <span className="text-sm tabular-nums text-ink-faint">{b.minutes} Min.</span>
              </li>
            ))}
          </ul>
        </Card>
        <Button size="lg" onClick={start}>Los geht&apos;s · {totalPlanned} Minuten</Button>
      </div>
    );

  if (finished || idx >= plan.blocks.length)
    return (
      <div className="space-y-6">
        <Card>
          <CardBody className="text-center">
            <CheckCircle2 className="mx-auto text-ok" size={44} />
            <h1 className="mt-3 text-2xl font-semibold">Lerneinheit abgeschlossen</h1>
            {results.length > 0 && <p className="mt-2 text-ink-soft">{results.filter((r) => r >= 0.8).length} von {results.length} Aufgaben gelöst.</p>}
            {!finished && unit && (
              <div className="mx-auto mt-6 max-w-md space-y-3">
                <p className="font-medium">Hast du „{unit.title}“ jetzt erarbeitet?</p>
                <p className="text-sm text-ink-soft">Wenn nicht, plant die App morgen weitere Zeit dafür ein. Wiederholungen kommen so oder so automatisch.</p>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => finish(true)}>Ja, Abschnitt erarbeitet</Button>
                  <Button variant="secondary" onClick={() => finish(false)}>Noch nicht ganz</Button>
                </div>
              </div>
            )}
            {(finished || !unit) && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {!finished && <Button onClick={() => finish(false)}>Speichern</Button>}
                <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-brand-50 px-4 font-medium text-brand-700">Zum Dashboard</Link>
                <Link href="/fortschritt" className="inline-flex h-10 items-center rounded-xl px-4 font-medium text-ink-soft">Lernfortschritt ansehen</Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );

  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="space-y-5">
      {/* progress header */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1">
            {plan.blocks.map((b, i) => (
              <button key={i} onClick={() => setIdx(i)} title={b.title} className={cx("h-2 flex-1 rounded-full", completed.has(i) ? "bg-ok" : i === idx ? "bg-brand-500" : "bg-brand-100")} style={{ flexGrow: b.minutes }} />
            ))}
          </div>
          <span className={cx("inline-flex items-center gap-1 text-sm tabular-nums", over ? "text-warn" : "text-ink-soft")}><Clock size={14} /> {mm}:{ss} / {block.minutes}:00</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <Badge tone="brand">{KIND_LABEL[block.kind]} · Schritt {idx + 1} von {plan.blocks.length}</Badge>
            <h1 className="mt-1 truncate text-lg font-semibold sm:text-xl">{block.title}</h1>
          </div>
          <Button variant="soft" size="sm" onClick={() => setTutorOpen(true)}><MessageCircle size={16} /> KI-Dozent</Button>
        </div>
        {over && <p className="mt-1 text-xs text-warn">Du brauchst länger als geplant – kein Problem, der Lernplan passt sich automatisch an.</p>}
      </div>

      {block.note && <Notice>{block.note}</Notice>}

      {block.kind === "review" && (
        <div className="space-y-6">
          {cards.length > 0 && <FlashcardReview cards={cards} />}
          {(block.itemIds ?? []).map((ref) => items[ref] && (
            <Card key={ref}><CardBody><p className="mb-2 text-xs text-ink-faint">Wiederholung einer Aufgabe, die beim letzten Mal nicht geklappt hat</p><QuizItemView item={items[ref].item} refId={ref} sessionId={session.id} onDone={note} /></CardBody></Card>
          ))}
        </div>
      )}

      {block.kind === "new" && lesson && (
        <div className="space-y-6">
          <LessonSections sections={lesson.sections.filter((s) => block.sectionIds?.includes(s.id))} />
          {lesson.definitions.length > 0 && <details className="group"><summary className="cursor-pointer font-semibold">Definitionen ({lesson.definitions.length})</summary><div className="mt-3"><DefinitionList defs={lesson.definitions} /></div></details>}
          {lesson.schemas.length > 0 && <details><summary className="cursor-pointer font-semibold">Prüfungsschemata ({lesson.schemas.length})</summary><div className="mt-3"><SchemaList schemas={lesson.schemas} /></div></details>}
          <Link href={`/lektion/${lesson.id}`} className="inline-block text-sm text-brand-600">Ganze Lerneinheit „{lesson.title}“ ansehen →</Link>
        </div>
      )}

      {(block.kind === "exercise" || block.kind === "check" || block.kind === "prep" || (block.kind === "application" && !block.useCase)) && (block.itemIds?.length ?? 0) > 0 && (
        <ItemSequence refs={block.itemIds!} items={items} sessionId={session.id} topicId={block.topicId} onResult={note} />
      )}

      {block.kind === "application" && block.useCase && lesson?.case && (
        <GutachtenCase lessonId={lesson.id} c={lesson.case} sessionId={session.id} topicId={block.topicId} />
      )}

      {block.kind === "reading" && (
        <div className="space-y-4">
          {readingDocId && block.reading ? (
            <PdfPages docId={readingDocId} from={block.reading.from} to={block.reading.to} />
          ) : (
            <Notice tone="warn" title="Originaldokument fehlt">Lade das passende Skript in der <Link className="underline" href="/bibliothek">Bibliothek</Link> hoch, dann erscheint es hier.</Notice>
          )}
          {aiReady && block.topicId && <GenerateLesson topicId={block.topicId} />}
        </div>
      )}

      {block.kind === "application" && !block.useCase && !(block.itemIds?.length) && (
        <TutorChat ctx={{ topicId: block.topicId, moduleId: unit?.moduleId }} starter="Frag mich dazu ab." compact aiReady={aiReady} />
      )}
      {block.kind === "check" && !(block.itemIds?.length) && (
        <TutorChat ctx={{ topicId: block.topicId, moduleId: unit?.moduleId }} starter="Stell mir drei kurze Kontrollfragen zu diesem Abschnitt, eine nach der anderen." compact aiReady={aiReady} />
      )}
      {block.kind === "hausarbeit" && (
        <Card><CardBody><p className="text-[15px]">Arbeite jetzt an deiner Hausarbeit. Tipp: Nutze den <Link className="text-brand-600 underline" href="/gutachten">Gutachtenstil-Trainer</Link> oder lass den KI-Dozenten einzelne Formulierungen prüfen.</p></CardBody></Card>
      )}
      {block.kind === "application" && plan.mode === "vorbereitung" && (
        <Link href="/klausur" className="inline-flex h-10 items-center rounded-xl bg-brand-500 px-4 font-medium text-white">Zum Klausurtrainer</Link>
      )}

      <div className="flex justify-end border-t border-line pt-4">
        <Button onClick={completeBlock}>{idx === plan.blocks.length - 1 ? "Lerneinheit beenden" : "Weiter"} <ChevronRight size={16} /></Button>
      </div>

      {tutorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setTutorOpen(false)}>
          <div className="safe-bottom h-full w-full max-w-xl overflow-hidden bg-canvas p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><p className="font-semibold">KI-Dozent</p><button onClick={() => setTutorOpen(false)} aria-label="Schließen"><X /></button></div>
            <TutorChat compact aiReady={aiReady} ctx={{ topicId: block.topicId ?? unit?.id, moduleId: unit?.moduleId, lessonTitle: lesson?.title, excerpt: lesson && block.kind === "new" ? lesson.sections.filter((s) => block.sectionIds?.includes(s.id)).map((s) => s.long).join("\n\n") : undefined }} />
          </div>
        </div>
      )}
    </div>
  );
}

function ItemSequence({ refs, items, sessionId, topicId, onResult }: { refs: string[]; items: Record<string, { lessonId: string; item: QuizItem }>; sessionId: string; topicId?: string; onResult: (r: ItemResult) => void }) {
  const [i, setI] = useState(0);
  const [doneMap, setDoneMap] = useState<Record<number, boolean>>({});
  const valid = refs.filter((r) => items[r]);
  if (!valid.length) return <Notice>Für diesen Schritt sind keine Aufgaben vorhanden.</Notice>;
  const ref = valid[Math.min(i, valid.length - 1)];
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-faint">Aufgabe {Math.min(i, valid.length - 1) + 1} von {valid.length}</p>
      <Card><CardBody>
        <QuizItemView key={ref} item={items[ref].item} refId={ref} sessionId={sessionId} topicId={topicId} onDone={(r) => { onResult(r); setDoneMap((d) => ({ ...d, [i]: true })); }} />
      </CardBody></Card>
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}>Zurück</Button>
        {i < valid.length - 1 && <Button variant={doneMap[i] ? "primary" : "ghost"} size="sm" onClick={() => setI(i + 1)}>{doneMap[i] ? "Nächste Aufgabe" : "Überspringen"}</Button>}
      </div>
    </div>
  );
}

function GenerateLesson({ topicId }: { topicId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function go() {
    setState("busy");
    const r = await fetch("/api/lessons/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topicId }) });
    const d = await r.json();
    if (!r.ok) { setState("error"); setMsg(d.error); return; }
    setState("done");
    setMsg(`„${d.title}“ mit ${d.quiz} Aufgaben und ${d.cards} Karteikarten erstellt.`);
  }
  return (
    <Card><CardBody>
      <p className="font-medium">Lerneinheit automatisch erstellen</p>
      <p className="mt-1 text-sm text-ink-soft">Der KI-Dozent bereitet diesen Abschnitt aus deinem Skript auf: Erklärung, Definitionen, Quiz, Fall und Karteikarten – jeweils mit Seitenangaben. Dauert 1–3 Minuten und kostet einmalig etwa 0,30–0,80 $.</p>
      {state === "done" ? <p className="mt-3 text-sm text-ok">{msg} Lade die Seite neu, um damit zu lernen.</p> : (
        <Button className="mt-3" onClick={go} disabled={state === "busy"}><Sparkles size={16} /> {state === "busy" ? "Wird erstellt …" : "Jetzt erstellen"}</Button>
      )}
      {state === "error" && <p className="mt-2 text-sm text-bad">{msg}</p>}
    </CardBody></Card>
  );
}
