"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Save, Send, Sparkles } from "lucide-react";
import { Button, Card, CardBody, Badge, Notice, cx } from "@/components/ui";
import { Markdown } from "@/components/docs/Markdown";
import { SourceChips } from "@/components/docs/SourceChips";
import { HighlightedAnswer } from "@/components/learn/Feedback";
import type { ExamEval } from "@/lib/ai/grade";
import type { SrcRef } from "@/lib/learning/types";

interface Exam { id: string; title: string; facts: string; question: string; solution: string | null; duration_min: number; started_at: string | null; submitted_at: string | null; answer: string; evaluation: (ExamEval & { self?: boolean }) | null; src: SrcRef[] }

export function ExamRoom({ exam, ai }: { exam: Exam; ai: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(exam.answer);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [left, setLeft] = useState<number>(() => {
    const start = exam.started_at ? Date.parse(exam.started_at) : Date.now();
    return Math.max(0, exam.duration_min * 60 - Math.floor((Date.now() - start) / 1000));
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [view, setView] = useState<"vergleich" | "loesung" | "auswertung">("auswertung");
  const [self, setSelf] = useState(0.5);
  const dirty = useRef(false);
  const submitted = !!exam.submitted_at;

  useEffect(() => {
    if (submitted) return;
    if (!exam.started_at) fetch(`/api/exams/${exam.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", answer: text }) });
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    const s = setInterval(async () => {
      if (!dirty.current) return;
      dirty.current = false;
      const r = await fetch(`/api/exams/${exam.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", answer: textRef.current }) });
      if (r.ok) setSavedAt(new Date().toLocaleTimeString("de-DE"));
    }, 10000);
    return () => { clearInterval(t); clearInterval(s); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);
  const textRef = useRef(text);
  useEffect(() => { textRef.current = text; }, [text]);

  async function submit() {
    if (!confirm("Bearbeitung jetzt abgeben? Danach ist keine Änderung mehr möglich.")) return;
    await fetch(`/api/exams/${exam.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "submit", answer: text }) });
    router.refresh();
  }
  async function evaluate(action: "evaluate" | "self") {
    setBusy(true); setErr("");
    const r = await fetch(`/api/exams/${exam.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, selfScore: self }) });
    setBusy(false);
    if (!r.ok) setErr((await r.json()).error); else router.refresh();
  }
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ev = exam.evaluation;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{exam.title}</h1>
        {!submitted && <span className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium tabular-nums", left < 300 ? "bg-bad-soft text-bad" : "bg-brand-50 text-brand-700")}><Clock size={15} /> {left === 0 ? "Zeit abgelaufen" : `${mm}:${ss}`}</span>}
      </div>
      <Card><CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Sachverhalt</p>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{exam.facts}</p>
        <p className="mt-3 rounded-xl bg-brand-50 p-3 font-medium text-brand-800">{exam.question}</p>
        <SourceChips src={exam.src} className="mt-3" />
      </CardBody></Card>

      {!submitted ? (
        <>
          {left === 0 && <Notice tone="warn">Die Bearbeitungszeit ist abgelaufen. Du kannst noch abgeben – in der echten Klausur wäre jetzt Schluss.</Notice>}
          <div className="rounded-2xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2 text-sm text-ink-soft">
              <span>Gutachten</span><span>·</span><span>{words} Wörter</span>
              <span className="ml-auto inline-flex items-center gap-1"><Save size={14} /> {savedAt ? `zwischengespeichert ${savedAt}` : "wird alle 10 s gespeichert"}</span>
            </div>
            <textarea value={text} onChange={(e) => { setText(e.target.value); dirty.current = true; }} spellCheck lang="de"
              placeholder={"A. Anspruch des K gegen V auf … aus § … BGB\n\nK könnte gegen V einen Anspruch auf … aus § … haben. Dann müsste …\n\nI. …"}
              className="min-h-[55vh] w-full resize-y rounded-b-2xl p-4 font-serif text-[17px] leading-relaxed outline-none" />
          </div>
          <Button onClick={submit}><Send size={16} /> Abgeben</Button>
        </>
      ) : (
        <>
          {!ev && (
            <Card><CardBody className="space-y-3">
              <p className="font-semibold">Auswertung</p>
              {ai ? (
                <Button onClick={() => evaluate("evaluate")} disabled={busy}><Sparkles size={16} /> {busy ? "Wird ausgewertet (1–2 Min.) …" : "KI-Auswertung starten"}</Button>
              ) : (
                <div className="space-y-2 text-sm">
                  <p>Vergleiche deine Lösung mit der Musterlösung (Reiter unten) und schätze ein, welchen Anteil der Lösungspunkte du getroffen hast:</p>
                  <input type="range" min={0} max={1} step={0.05} value={self} onChange={(e) => setSelf(Number(e.target.value))} className="w-full max-w-sm" />
                  <p>{Math.round(self * 100)} % der Lösungspunkte</p>
                  <Button onClick={() => evaluate("self")}>Selbsteinschätzung speichern</Button>
                </div>
              )}
              {err && <p className="text-sm text-bad">{err}</p>}
            </CardBody></Card>
          )}
          <div className="flex gap-1">
            {(["auswertung", "vergleich", "loesung"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={cx("rounded-full px-4 py-1.5 text-sm font-medium", view === v ? "bg-brand-500 text-white" : "border border-line bg-surface text-ink-soft")}>{{ auswertung: "Auswertung", vergleich: "Vergleich", loesung: "Musterlösung" }[v]}</button>)}
          </div>
          {view === "auswertung" && ev && !ev.self && (
            <Card><CardBody className="space-y-4">
              <p className="text-xs text-ink-faint">KI-gestützte Rückmeldung – keine offizielle universitäre Bewertung oder Note.</p>
              <p className="text-[15px]">{ev.overall}</p>
              <div className="flex flex-wrap gap-2">
                <Badge tone={ev.basisCorrect ? "ok" : "bad"}>Anspruchs-/Prüfungsgrundlage {ev.basisCorrect ? "richtig gewählt" : "nicht richtig gewählt"}</Badge>
                <Badge>{Math.round(ev.rubricScore * 100)} % der Lösungspunkte</Badge>
              </div>
              <p className="text-sm text-ink-soft">{ev.basisComment}</p>
              <div>
                <p className="mb-1 font-medium">Erkannte Probleme</p>
                <ul className="space-y-1 text-sm">{ev.problems.map((p, i) => <li key={i}><Badge tone={p.recognized === "ja" ? "ok" : p.recognized === "teilweise" ? "warn" : "bad"}>{p.recognized}</Badge> <span className="font-medium">{p.problem}</span> – {p.comment}</li>)}</ul>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div><p className="font-medium">Aufbau & Gutachtenstil</p><p className="text-ink-soft">{ev.structure}</p></div>
                <div><p className="font-medium">Sprache</p><p className="text-ink-soft">{ev.language}</p></div>
              </div>
              {ev.issues.length > 0 && <div><p className="mb-1 font-medium">Markierte Stellen</p><HighlightedAnswer answer={exam.answer} issues={ev.issues} />
                <ol className="mt-2 space-y-1 text-sm">{ev.issues.map((i, n) => <li key={n}><span className="font-semibold">{n + 1}.</span> <Badge tone={i.category === "inhaltlich" ? "bad" : i.category === "methodisch" ? "warn" : "brand"}>{i.category}</Badge> {i.explanation} <span className="text-ok">→ {i.suggestion}</span></li>)}</ol></div>}
              {ev.strengths.length > 0 && <div className="text-sm"><p className="font-medium">Stärken</p><ul className="list-disc pl-5">{ev.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
              {ev.nextSteps.length > 0 && <div className="text-sm"><p className="font-medium">Empfohlene nächste Übungen</p><ul className="list-disc pl-5">{ev.nextSteps.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
            </CardBody></Card>
          )}
          {view === "auswertung" && ev?.self && <Notice>Selbsteinschätzung gespeichert: {Math.round(ev.rubricScore * 100)} % der Lösungspunkte.</Notice>}
          {view === "vergleich" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardBody><p className="mb-2 font-semibold">Deine Bearbeitung</p><p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed">{exam.answer || "(leer)"}</p></CardBody></Card>
              <Card><CardBody><p className="mb-2 font-semibold">Musterlösung</p><Markdown text={exam.solution ?? ""} /></CardBody></Card>
            </div>
          )}
          {view === "loesung" && <Card><CardBody><Markdown text={exam.solution ?? ""} /></CardBody></Card>}
        </>
      )}
    </div>
  );
}
