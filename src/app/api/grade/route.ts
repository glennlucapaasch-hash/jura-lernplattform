import { handle, ok, fail } from "@/lib/http";
import { resolveItem } from "@/lib/repo/items";
import { getLesson, recordAttempt, recordMistake } from "@/lib/repo/study";
import { aiAvailable } from "@/lib/ai/client";
import { gradeAnswer } from "@/lib/ai/grade";
import { retrieve } from "@/lib/repo/documents";
import { TYPE_LEVEL, type Level } from "@/lib/learning/mastery";

/**
 * Free-text evaluation.
 *  - with AI: rubric-based feedback with categorised issues (inhaltlich/methodisch/sprachlich)
 *  - without AI (or mode=self): self-assessment against the model answer's rubric
 * Body: { ref } for quiz items or { lessonId, casePart } for Gutachten steps.
 */
export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as {
    ref?: string; lessonId?: string; casePart?: number; answer: string; hintsUsed?: number; sessionId?: string; topicId?: string;
    mode?: "ai" | "self"; selfRubric?: boolean[]; record?: boolean;
  };
  let task = "", context: string | undefined, modelAnswer = "", rubric: string[] = [], part: string | undefined;
  let lessonId = "", itemId = "", moduleId = "", topicId = b.topicId, type = "", level: Level = "apply", difficulty = 2;
  if (b.ref) {
    const r = resolveItem(b.ref);
    if (!r || (r.item.type !== "free" && r.item.type !== "case")) return fail("Aufgabe nicht gefunden", 404);
    task = r.item.prompt; modelAnswer = r.item.modelAnswer; rubric = r.item.rubric;
    lessonId = r.lesson.id; itemId = r.item.id; moduleId = r.lesson.moduleId; topicId ??= r.lesson.topicIds[0];
    type = r.item.type; level = r.item.level; difficulty = r.item.difficulty;
  } else if (b.lessonId != null && b.casePart != null) {
    const l = getLesson(b.lessonId);
    const step = l?.case?.steps[b.casePart];
    if (!l || !step) return fail("Fallschritt nicht gefunden", 404);
    task = step.prompt; context = `${l.case!.facts}\n\nFallfrage: ${l.case!.question}`; modelAnswer = step.model; rubric = step.rubric; part = step.part;
    lessonId = l.id; itemId = `case-${b.casePart}`; moduleId = l.moduleId; topicId ??= l.topicIds[0];
    type = `gutachten-${step.part}`; level = TYPE_LEVEL[type] ?? "formulate"; difficulty = 2;
  } else return fail("Ungültige Anfrage");

  if (!b.answer?.trim()) return fail("Bitte zuerst eine Antwort schreiben.");
  const useAi = b.mode !== "self" && aiAvailable();
  if (!useAi) {
    // Self-assessment: the learner ticks the rubric points they covered.
    if (!b.selfRubric) return ok({ mode: "self", modelAnswer, rubric });
    const score = rubric.length ? b.selfRubric.filter(Boolean).length / rubric.length : 0;
    if (b.record !== false) recordAttempt({ lessonId, itemId, topicId, moduleId, type, level, difficulty, score: score * 0.9, hintsUsed: b.hintsUsed ?? 0, answer: b.answer, feedback: { self: b.selfRubric }, sessionId: b.sessionId });
    return ok({ mode: "self", score, modelAnswer, rubric });
  }
  const passages = retrieve(`${task} ${modelAnswer.slice(0, 300)}`, { moduleId, limit: 4 });
  const fb = await gradeAnswer({ task, context, answer: b.answer, modelAnswer, rubric, part, passages });
  if (b.record !== false) {
    recordAttempt({ lessonId, itemId, topicId, moduleId, type, level, difficulty, score: fb.score, hintsUsed: b.hintsUsed ?? 0, answer: b.answer, feedback: fb, sessionId: b.sessionId });
    for (const i of fb.issues.filter((x) => x.severity !== "leicht").slice(0, 3))
      recordMistake({ topicId, moduleId, category: i.category, description: i.explanation.slice(0, 200), origin: part ? "gutachten" : "quiz", refId: `${lessonId}::${itemId}` });
  }
  return ok({ mode: "ai", feedback: fb, modelAnswer, rubric });
});
