import { handle, ok, fail } from "@/lib/http";
import { getExam, saveDraft, submitExam, storeEvaluation } from "@/lib/repo/exams";
import { aiAvailable } from "@/lib/ai/client";
import { evaluateExam } from "@/lib/ai/grade";
import { retrieve } from "@/lib/repo/documents";

export const runtime = "nodejs";
export const maxDuration = 600;

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const e = getExam(id);
  if (!e) return fail("Klausur nicht gefunden", 404);
  // the model solution is only revealed after submission
  return ok({ exam: { ...e, solution: e.submitted_at ? e.solution : null, evaluation: e.evaluation ? JSON.parse(e.evaluation) : null, src: JSON.parse(e.src) }, ai: aiAvailable() });
});

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const e = getExam(id);
  if (!e) return fail("Klausur nicht gefunden", 404);
  const b = (await req.json()) as { action: "save" | "submit" | "evaluate" | "self"; answer?: string; selfScore?: number };
  if (b.action === "save") { saveDraft(id, b.answer ?? ""); return ok({ savedAt: new Date().toISOString() }); }
  if (b.action === "submit") { submitExam(id, b.answer ?? e.answer); return ok({ ok: true }); }
  if (!e.submitted_at) return fail("Bitte zuerst abgeben.");
  if (b.action === "self") {
    const score = Math.max(0, Math.min(1, b.selfScore ?? 0));
    storeEvaluation(id, { self: true, rubricScore: score }, score * 0.9, []);
    return ok({ ok: true });
  }
  const passages = retrieve(`${e.title} ${e.question} ${e.facts.slice(0, 400)}`, { moduleId: e.module_id, limit: 5 });
  const ev = await evaluateExam({ facts: e.facts, question: e.question, solution: e.solution ?? "", answer: e.answer, passages });
  storeEvaluation(id, ev, ev.rubricScore, ev.issues);
  return ok({ evaluation: ev });
});
