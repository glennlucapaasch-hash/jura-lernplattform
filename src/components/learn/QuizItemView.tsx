"use client";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Lightbulb, Eye, Check, RotateCcw, Sparkles } from "lucide-react";
import { Button, Badge, cx } from "@/components/ui";
import { gradeClosed, seededShuffle, type QuizAnswer } from "@/lib/learning/grading";
import { QUIZ_TYPE_LABEL, type QuizItem } from "@/lib/learning/types";
import { LEVEL_LABEL } from "@/lib/learning/mastery";
import { SourceChips } from "@/components/docs/SourceChips";
import { FeedbackView } from "./Feedback";
import { DictateButton } from "@/components/speech/SpeechBar";
import type { Feedback } from "@/lib/ai/grade";

export interface ItemResult { score: number; hintsUsed: number; revealed: boolean }

const DIFF = ["", "leicht", "mittel", "schwer"];

export function QuizItemView({ item, refId, sessionId, topicId, onDone, compact }: {
  item: QuizItem; refId: string; sessionId?: string; topicId?: string; onDone?: (r: ItemResult) => void; compact?: boolean;
}) {
  const open = item.type === "free" || item.type === "case";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="brand">{QUIZ_TYPE_LABEL[item.type]}</Badge>
        <Badge>{LEVEL_LABEL[item.level]}</Badge>
        <Badge>{DIFF[item.difficulty]}</Badge>
      </div>
      {open ? (
        <OpenItem item={item as Extract<QuizItem, { type: "free" | "case" }>} refId={refId} sessionId={sessionId} topicId={topicId} onDone={onDone} />
      ) : (
        <ClosedItem item={item} refId={refId} sessionId={sessionId} topicId={topicId} onDone={onDone} />
      )}
      {!compact && <SourceChips src={item.src} />}
    </div>
  );
}

function ClosedItem({ item, refId, sessionId, topicId, onDone }: { item: QuizItem; refId: string; sessionId?: string; topicId?: string; onDone?: (r: ItemResult) => void }) {
  const hints = item.hints ?? [];
  const [hintsShown, setHintsShown] = useState(0);
  const [state, setState] = useState<"answering" | "wrong" | "correct" | "revealed">("answering");
  const [partial, setPartial] = useState<string[]>([]);
  // answer states
  const [sel, setSel] = useState<number[]>([]);
  const [tf, setTf] = useState<boolean | null>(null);
  const [cloze, setCloze] = useState<string[]>([]);
  const [match, setMatch] = useState<number[]>([]);
  const shuffledOrder = useMemo(() => (item.type === "order" ? seededShuffle(item.items, refId) : []), [item, refId]);
  const [order, setOrder] = useState<string[]>(shuffledOrder);
  const optionOrder = useMemo(() => (item.type === "mc-single" || item.type === "mc-multi" ? seededShuffle(item.options.map((_, i) => i), refId) : []), [item, refId]);
  const rightOrder = useMemo(() => (item.type === "match" ? seededShuffle(item.pairs.map((_, i) => i), refId + "r") : []), [item, refId]);

  const answer = (): QuizAnswer | null => {
    switch (item.type) {
      case "mc-single": case "mc-multi": return sel.length ? { type: item.type, selected: sel } : null;
      case "truefalse": return tf === null ? null : { type: "truefalse", value: tf };
      case "cloze": return { type: "cloze", values: item.blanks.map((_, i) => cloze[i] ?? "") };
      case "match": return match.filter((m) => m !== undefined && m >= 0).length === item.pairs.length ? { type: "match", mapping: match } : null;
      case "order": return { type: "order", order };
      default: return null;
    }
  };

  async function finish(final: "correct" | "revealed") {
    const a = answer();
    setState(final);
    let score = 0;
    if (a) {
      const r = await fetch("/api/attempt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ref: refId, answer: a, hintsUsed: hintsShown + (final === "revealed" ? 1 : 0), sessionId, topicId }) });
      if (r.ok) score = (await r.json()).score;
    }
    onDone?.({ score: final === "revealed" ? Math.min(score, 0.3) : score, hintsUsed: hintsShown, revealed: final === "revealed" });
  }

  function check() {
    const a = answer();
    if (!a) return;
    const g = gradeClosed(item, a);
    if (g.correct) return finish("correct");
    setPartial(g.details);
    setState("wrong");
    if (hintsShown < hints.length) setHintsShown((h) => h + 1);
  }

  const locked = state === "correct" || state === "revealed";
  const showSolution = locked;
  const correctSet = item.type === "mc-single" || item.type === "mc-multi" ? new Set(item.answer) : new Set<number>();

  return (
    <div className="space-y-4">
      {item.type !== "cloze" && <p className="text-[17px] font-medium leading-relaxed">{item.prompt}</p>}
      {item.type === "mc-multi" && <p className="text-sm font-medium text-brand-700">Wähle genau {item.answer.length} Antworten aus.</p>}
      {item.type === "mc-single" && <p className="text-sm text-ink-soft">Genau eine Antwort ist richtig.</p>}

      {(item.type === "mc-single" || item.type === "mc-multi") && (
        <div className="grid gap-2">
          {optionOrder.map((oi, n) => {
            const active = sel.includes(oi);
            const isRight = correctSet.has(oi);
            return (
              <button key={oi} disabled={locked}
                onClick={() => { setState("answering"); setSel(item.type === "mc-single" ? [oi] : active ? sel.filter((x) => x !== oi) : [...sel, oi]); }}
                className={cx("flex items-start gap-3 rounded-xl border p-3 text-left text-[15px] transition",
                  showSolution && isRight ? "border-ok bg-ok-soft" : showSolution && active && !isRight ? "border-bad bg-bad-soft" : active ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-200")}>
                <span className={cx("mt-0.5 grid h-6 w-6 shrink-0 place-items-center border text-xs font-semibold", item.type === "mc-single" ? "rounded-full" : "rounded-md", active ? "border-brand-500 bg-brand-500 text-white" : "border-line")}>
                  {String.fromCharCode(65 + n)}
                </span>
                <span>{item.options[oi]}</span>
              </button>
            );
          })}
        </div>
      )}

      {item.type === "truefalse" && (
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <Button key={String(v)} variant={tf === v ? "primary" : "secondary"} disabled={locked} onClick={() => { setTf(v); setState("answering"); }}
              className={cx(showSolution && item.answer === v && "ring-2 ring-ok")}>
              {v ? "Richtig" : "Falsch"}
            </Button>
          ))}
        </div>
      )}

      {item.type === "cloze" && (
        <p className="text-[17px] leading-loose">
          {item.prompt.split(/(\{\{\d+\}\})/g).map((part, i) => {
            const m = part.match(/\{\{(\d+)\}\}/);
            if (!m) return <span key={i}>{part}</span>;
            const bi = Number(m[1]) - 1;
            return (
              <span key={i} className="inline-block">
                <input value={cloze[bi] ?? ""} disabled={locked} onChange={(e) => { const c = [...cloze]; c[bi] = e.target.value; setCloze(c); setState("answering"); }}
                  className={cx("mx-1 w-44 rounded-lg border px-2 py-0.5 text-[15px] outline-none focus:border-brand-400", showSolution ? "border-ok" : "border-line")}
                  placeholder={`Lücke ${bi + 1}`} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                {showSolution && <span className="text-sm text-ok">({item.blanks[bi][0]})</span>}
              </span>
            );
          })}
        </p>
      )}

      {item.type === "match" && (
        <div className="space-y-2">
          {item.pairs.map((p, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2 sm:items-center">
              <span className="text-[15px] font-medium">{p[0]}</span>
              <select disabled={locked} value={match[i] ?? -1} onChange={(e) => { const m = [...match]; m[i] = Number(e.target.value); setMatch(m); setState("answering"); }}
                className={cx("h-10 rounded-lg border bg-surface px-2 text-[15px]", showSolution ? (match[i] === i ? "border-ok" : "border-bad") : "border-line")}>
                <option value={-1}>– zuordnen –</option>
                {rightOrder.map((ri) => <option key={ri} value={ri}>{item.pairs[ri][1]}</option>)}
              </select>
              {showSolution && match[i] !== i && <span className="text-sm text-ok sm:col-span-2">Richtig: {p[1]}</span>}
            </div>
          ))}
        </div>
      )}

      {item.type === "order" && (
        <ol className="space-y-2">
          {order.map((it, i) => (
            <li key={it} className={cx("flex items-center gap-2 rounded-xl border p-2.5 text-[15px]", showSolution ? (item.items[i] === it ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft") : "border-line")}>
              <span className="w-6 text-center font-semibold text-ink-faint">{i + 1}.</span>
              <span className="flex-1">{it}</span>
              {!locked && (
                <span className="flex gap-1">
                  <button aria-label="nach oben" disabled={i === 0} onClick={() => { const o = [...order]; [o[i - 1], o[i]] = [o[i], o[i - 1]]; setOrder(o); setState("answering"); }} className="rounded-lg p-1.5 hover:bg-brand-50 disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button aria-label="nach unten" disabled={i === order.length - 1} onClick={() => { const o = [...order]; [o[i + 1], o[i]] = [o[i], o[i + 1]]; setOrder(o); setState("answering"); }} className="rounded-lg p-1.5 hover:bg-brand-50 disabled:opacity-30"><ArrowDown size={16} /></button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {state === "wrong" && (
        <div className="rounded-xl bg-warn-soft p-3 text-sm text-amber-900">
          <p className="font-medium">Noch nicht ganz richtig.{item.type === "mc-multi" || item.type === "cloze" || item.type === "match" || item.type === "order" ? " Teilweise stimmt es schon." : ""}</p>
          {hintsShown > 0 && (
            <ul className="mt-1.5 space-y-1">
              {hints.slice(0, hintsShown).map((h, i) => <li key={i} className="flex gap-1.5"><Lightbulb size={15} className="mt-0.5 shrink-0" /> {h}</li>)}
            </ul>
          )}
          {hintsShown === 0 && hints.length === 0 && <p className="mt-1">Lies die Aufgabe noch einmal genau und versuche es erneut.</p>}
          {item.type !== "mc-single" && item.type !== "truefalse" && partial.length > 0 && hintsShown >= hints.length && <p className="mt-1 text-xs opacity-80">{partial.length} Teil(e) noch falsch.</p>}
        </div>
      )}

      {state === "correct" && <p className="rounded-xl bg-ok-soft p-3 text-sm font-medium text-ok">Richtig{hintsShown ? ` – mit ${hintsShown} Hinweis${hintsShown > 1 ? "en" : ""}` : " – ohne Hilfe"}!</p>}
      {locked && item.explanation && <p className="rounded-xl bg-canvas p-3 text-[15px] leading-relaxed">{item.explanation}</p>}

      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={check} disabled={!answer()}><Check size={16} /> Prüfen</Button>
          {state === "wrong" && hintsShown < hints.length && (
            <Button variant="soft" onClick={() => setHintsShown((h) => h + 1)}><Lightbulb size={16} /> Weiterer Hinweis</Button>
          )}
          {state === "answering" && hintsShown === 0 && hints.length > 0 && (
            <Button variant="ghost" onClick={() => { setHintsShown(1); setState("wrong"); }}><Lightbulb size={16} /> Hinweis</Button>
          )}
          {state === "wrong" && (hintsShown >= hints.length) && (
            <Button variant="ghost" onClick={() => finish("revealed")}><Eye size={16} /> Lösung anzeigen</Button>
          )}
        </div>
      )}
    </div>
  );
}

type OpenQuiz = Extract<QuizItem, { type: "free" | "case" }>;

export function OpenAnswer({ prompt, context, gradeBody, hints, onDone, placeholder }: {
  prompt?: string; context?: string; gradeBody: Record<string, unknown>; hints?: string[]; onDone?: (r: ItemResult) => void; placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fb, setFb] = useState<Feedback | null>(null);
  const [self, setSelf] = useState<{ modelAnswer: string; rubric: string[] } | null>(null);
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [rounds, setRounds] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [showModel, setShowModel] = useState(false);
  const [done, setDone] = useState(false);
  const [modelAnswer, setModelAnswer] = useState("");

  async function grade(mode?: "self") {
    setBusy(true); setErr("");
    const r = await fetch("/api/grade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...gradeBody, answer: text, hintsUsed: rounds + hintsShown, mode }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(d.error ?? "Bewertung fehlgeschlagen");
    setModelAnswer(d.modelAnswer);
    if (d.mode === "self") { setSelf({ modelAnswer: d.modelAnswer, rubric: d.rubric }); setTicks(d.rubric.map(() => false)); return; }
    setFb(d.feedback);
    setRounds((n) => n + 1);
    if (d.feedback.verdict === "richtig") { setDone(true); setShowModel(true); onDone?.({ score: d.feedback.score, hintsUsed: rounds + hintsShown, revealed: false }); }
  }

  async function submitSelf() {
    const r = await fetch("/api/grade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...gradeBody, answer: text, hintsUsed: hintsShown, mode: "self", selfRubric: ticks }) });
    const d = await r.json();
    setDone(true);
    onDone?.({ score: d.score ?? 0, hintsUsed: hintsShown, revealed: false });
  }

  return (
    <div className="space-y-3">
      {prompt && <p className="text-[17px] font-medium leading-relaxed whitespace-pre-wrap">{prompt}</p>}
      {context && <p className="whitespace-pre-wrap rounded-xl bg-canvas p-3 text-[15px]">{context}</p>}
      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={done || !!self} rows={6} placeholder={placeholder ?? "Deine Antwort …"}
        className="w-full rounded-xl border border-line bg-surface p-3 text-[15px] leading-relaxed outline-none focus:border-brand-400" />
      {hintsShown > 0 && (
        <ul className="space-y-1 rounded-xl bg-warn-soft p-3 text-sm text-amber-900">
          {(hints ?? []).slice(0, hintsShown).map((h, i) => <li key={i} className="flex gap-1.5"><Lightbulb size={15} className="mt-0.5 shrink-0" /> {h}</li>)}
        </ul>
      )}
      {err && <p className="text-sm text-bad">{err}</p>}
      {!done && !self && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => grade()} disabled={busy || text.trim().length < 5}><Sparkles size={16} /> {busy ? "Wird geprüft …" : fb ? "Überarbeitung prüfen" : "Antwort prüfen"}</Button>
          <DictateButton onText={(t) => setText((x) => (x ? x + " " : "") + t)} />
          {hints && hintsShown < hints.length && <Button variant="soft" onClick={() => setHintsShown((h) => h + 1)}><Lightbulb size={16} /> Hinweis</Button>}
          {fb && <Button variant="ghost" onClick={() => { setShowModel(true); setDone(true); onDone?.({ score: fb.score, hintsUsed: rounds + hintsShown, revealed: true }); }}><Eye size={16} /> Lösung zeigen</Button>}
          {!fb && <Button variant="ghost" onClick={() => grade("self")} disabled={text.trim().length < 5}>Selbst vergleichen</Button>}
        </div>
      )}
      {fb && (
        <div className="rounded-2xl border border-line p-4">
          <FeedbackView fb={fb} answer={text} showImproved={showModel} />
          {!done && fb.hint && <p className="mt-3 flex gap-1.5 rounded-xl bg-brand-50 p-3 text-sm text-brand-800"><Lightbulb size={16} className="mt-0.5 shrink-0" /> {fb.hint}</p>}
          {!done && <p className="mt-2 text-xs text-ink-faint">Überarbeite deine Antwort oben und lass sie erneut prüfen – oder lass dir die Lösung zeigen.</p>}
        </div>
      )}
      {self && !done && (
        <div className="space-y-3 rounded-2xl border border-line p-4">
          <p className="text-sm font-medium">Vergleiche selbst: Welche Punkte enthält deine Antwort?</p>
          {self.rubric.map((r, i) => (
            <label key={i} className="flex items-start gap-2 text-[15px]">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={ticks[i] ?? false} onChange={(e) => { const t = [...ticks]; t[i] = e.target.checked; setTicks(t); }} /> {r}
            </label>
          ))}
          <div className="rounded-xl bg-ok-soft p-3 text-sm"><p className="mb-1 font-medium text-ok">Musterlösung</p><p className="whitespace-pre-wrap">{self.modelAnswer}</p></div>
          <Button onClick={submitSelf}>Selbsteinschätzung speichern</Button>
        </div>
      )}
      {done && showModel && modelAnswer && !self && (
        <div className="rounded-xl bg-ok-soft p-3 text-sm"><p className="mb-1 font-medium text-ok">Musterlösung</p><p className="whitespace-pre-wrap">{modelAnswer}</p></div>
      )}
      {done && <p className="flex items-center gap-1.5 text-sm text-ok"><Check size={16} /> Gespeichert.</p>}
      {done && !self && <Button variant="ghost" size="sm" onClick={() => { setDone(false); setFb(null); setShowModel(false); setText(""); }}><RotateCcw size={14} /> Neu versuchen</Button>}
    </div>
  );
}

function OpenItem({ item, refId, sessionId, topicId, onDone }: { item: OpenQuiz; refId: string; sessionId?: string; topicId?: string; onDone?: (r: ItemResult) => void }) {
  return <OpenAnswer prompt={item.prompt} hints={item.hints} gradeBody={{ ref: refId, sessionId, topicId }} onDone={onDone} />;
}
