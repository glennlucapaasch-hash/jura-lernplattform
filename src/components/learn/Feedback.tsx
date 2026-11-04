"use client";
import { Badge, cx } from "@/components/ui";
import type { Feedback } from "@/lib/ai/grade";

const CAT_TONE = { inhaltlich: "bad", methodisch: "warn", sprachlich: "brand" } as const;

/** Highlights quoted problem passages inside the learner's own text. */
export function HighlightedAnswer({ answer, issues }: { answer: string; issues: Feedback["issues"] }) {
  const marks: { start: number; end: number; i: number }[] = [];
  issues.forEach((iss, i) => {
    const q = iss.quote?.trim();
    if (!q || q.length < 3) return;
    const pos = answer.indexOf(q);
    if (pos >= 0 && !marks.some((m) => pos < m.end && pos + q.length > m.start)) marks.push({ start: pos, end: pos + q.length, i });
  });
  marks.sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of marks) {
    parts.push(answer.slice(last, m.start));
    parts.push(
      <mark key={m.start} className={cx("issue", issues[m.i].category === "inhaltlich" && "issue-bad")} title={issues[m.i].explanation}>
        {answer.slice(m.start, m.end)}<sup className="ml-0.5 text-[10px] font-semibold">{m.i + 1}</sup>
      </mark>,
    );
    last = m.end;
  }
  parts.push(answer.slice(last));
  return <p className="whitespace-pre-wrap rounded-xl bg-canvas p-3 text-[15px] leading-relaxed">{parts}</p>;
}

export function FeedbackView({ fb, answer, showImproved }: { fb: Feedback; answer: string; showImproved: boolean }) {
  const tone = fb.verdict === "richtig" ? "ok" : fb.verdict === "falsch" ? "bad" : "warn";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{fb.verdict}</Badge>
        <span className="text-sm text-ink-soft">{fb.rubric.filter((r) => r.met).length} von {fb.rubric.length} Kriterien erfüllt</span>
        <span className="text-xs text-ink-faint">· KI-Rückmeldung, keine offizielle Bewertung</span>
      </div>
      <p className="text-[15px]">{fb.summary}</p>
      {fb.issues.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Deine Antwort mit markierten Stellen</p>
          <HighlightedAnswer answer={answer} issues={fb.issues} />
          <ol className="mt-3 space-y-2">
            {fb.issues.map((i, n) => (
              <li key={n} className="rounded-xl border border-line p-3 text-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{n + 1}.</span>
                  <Badge tone={CAT_TONE[i.category]}>{i.category}</Badge>
                  <span className="text-xs text-ink-faint">{i.severity}</span>
                  {i.quote && <span className="italic text-ink-soft">„{i.quote.slice(0, 90)}{i.quote.length > 90 ? "…" : ""}“</span>}
                </div>
                <p>{i.explanation}</p>
                {showImproved && i.suggestion && <p className="mt-1 text-ok">Besser: {i.suggestion}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
      <details className="rounded-xl border border-line p-3 text-sm">
        <summary className="cursor-pointer font-medium">Bewertungskriterien</summary>
        <ul className="mt-2 space-y-1">
          {fb.rubric.map((r, i) => (
            <li key={i}><span className={r.met ? "text-ok" : "text-bad"}>{r.met ? "✓" : "✗"}</span> {r.criterion}{r.comment ? <span className="text-ink-soft"> – {r.comment}</span> : null}</li>
          ))}
        </ul>
      </details>
      {showImproved && fb.improved && (
        <div className="rounded-xl bg-ok-soft p-3 text-sm">
          <p className="mb-1 font-medium text-ok">Mögliche präzise Formulierung</p>
          <p className="whitespace-pre-wrap">{fb.improved}</p>
        </div>
      )}
    </div>
  );
}
