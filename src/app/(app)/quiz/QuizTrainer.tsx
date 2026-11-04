"use client";
import { useMemo, useState } from "react";
import { Button, Card, CardBody, Empty, cx } from "@/components/ui";
import type { LessonPack, QuizItem } from "@/lib/learning/types";
import { QUIZ_TYPE_LABEL } from "@/lib/learning/types";
import { QuizItemView } from "@/components/learn/QuizItemView";

type Mode = "alle" | "fehler" | "neu";

export function QuizTrainer({ lessons, modules, stats, initialModule }: { lessons: LessonPack[]; modules: { id: string; title: string }[]; stats: Record<string, { best: number; n: number }>; initialModule?: string }) {
  const [moduleId, setModuleId] = useState(initialModule ?? "");
  const [lessonId, setLessonId] = useState("");
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [diff, setDiff] = useState(0);
  const [mode, setMode] = useState<Mode>("alle");
  const [round, setRound] = useState<{ ref: string; item: QuizItem }[] | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState<number[]>([]);

  const pool = useMemo(() => lessons
    .filter((l) => (!moduleId || l.moduleId === moduleId) && (!lessonId || l.id === lessonId))
    .flatMap((l) => l.quiz.map((q) => ({ ref: `${l.id}::${q.id}`, item: q })))
    .filter(({ ref, item }) => (!types.size || types.has(item.type)) && (!diff || item.difficulty === diff) &&
      (mode === "alle" || (mode === "fehler" ? stats[ref] && stats[ref].best < 0.8 : !stats[ref]))), [lessons, moduleId, lessonId, types, diff, mode, stats]);

  function start() { setRound([...pool].sort(() => Math.random() - 0.5).slice(0, 10)); setI(0); setScore([]); }

  if (round) {
    if (i >= round.length)
      return (
        <Card><CardBody className="text-center">
          <p className="text-xl font-semibold">Runde beendet</p>
          <p className="mt-1 text-ink-soft">{score.filter((s) => s >= 0.8).length} von {round.length} richtig.</p>
          <div className="mt-4 flex justify-center gap-2"><Button onClick={start}>Neue Runde</Button><Button variant="secondary" onClick={() => setRound(null)}>Filter ändern</Button></div>
        </CardBody></Card>
      );
    const cur = round[i];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-ink-faint"><span>Aufgabe {i + 1} von {round.length}</span><button onClick={() => setRound(null)} className="text-brand-600">Abbrechen</button></div>
        <Card><CardBody><QuizItemView key={cur.ref} item={cur.item} refId={cur.ref} onDone={(r) => setScore((s) => [...s, r.score])} /></CardBody></Card>
        <div className="flex justify-end"><Button onClick={() => setI(i + 1)}>{score.length > i ? "Nächste Aufgabe" : "Überspringen"}</Button></div>
      </div>
    );
  }
  if (!lessons.length) return <Empty title="Noch keine Aufgaben">Aufgaben entstehen aus den Lerneinheiten.</Empty>;

  return (
    <Card><CardBody className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setLessonId(""); }} className="h-10 rounded-xl border border-line bg-surface px-3">
          <option value="">Alle Module</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-3">
          <option value="">Alle Lerneinheiten</option>{lessons.filter((l) => !moduleId || l.moduleId === moduleId).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </div>
      <div>
        <p className="mb-1.5 text-sm text-ink-soft">Aufgabentypen</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(QUIZ_TYPE_LABEL).map(([k, v]) => (
            <button key={k} onClick={() => { const t = new Set(types); if (t.has(k)) t.delete(k); else t.add(k); setTypes(t); }} className={cx("rounded-full border px-3 py-1 text-sm", types.has(k) ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-soft")}>{v}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <div><p className="mb-1.5 text-sm text-ink-soft">Schwierigkeit</p>
          <div className="flex gap-1">{["alle", "leicht", "mittel", "schwer"].map((d, n) => <button key={d} onClick={() => setDiff(n)} className={cx("rounded-full border px-3 py-1 text-sm", diff === n ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-soft")}>{d}</button>)}</div>
        </div>
        <div><p className="mb-1.5 text-sm text-ink-soft">Auswahl</p>
          <div className="flex gap-1">{(["alle", "neu", "fehler"] as Mode[]).map((m) => <button key={m} onClick={() => setMode(m)} className={cx("rounded-full border px-3 py-1 text-sm", mode === m ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-soft")}>{m === "fehler" ? "meine Fehler" : m === "neu" ? "noch nicht bearbeitet" : "alle"}</button>)}</div>
        </div>
      </div>
      <Button onClick={start} disabled={!pool.length}>Runde starten ({Math.min(10, pool.length)} von {pool.length} Aufgaben)</Button>
    </CardBody></Card>
  );
}
