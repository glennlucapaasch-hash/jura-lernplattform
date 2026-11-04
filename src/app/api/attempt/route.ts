import { handle, ok, fail } from "@/lib/http";
import { resolveItem } from "@/lib/repo/items";
import { recordAttempt, recordMistake } from "@/lib/repo/study";
import { gradeClosed, type QuizAnswer } from "@/lib/learning/grading";

/** Grades closed question types deterministically and stores the attempt. */
export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { ref: string; answer: QuizAnswer; hintsUsed?: number; sessionId?: string; topicId?: string };
  const r = resolveItem(b.ref);
  if (!r) return fail("Aufgabe nicht gefunden", 404);
  const res = gradeClosed(r.item, b.answer);
  const topicId = b.topicId ?? r.lesson.topicIds[0];
  recordAttempt({
    lessonId: r.lesson.id, itemId: r.item.id, topicId, moduleId: r.lesson.moduleId, type: r.item.type, level: r.item.level,
    difficulty: r.item.difficulty, score: res.score, hintsUsed: b.hintsUsed ?? 0, answer: b.answer, feedback: res.details, sessionId: b.sessionId,
  });
  if (res.score < 0.5) recordMistake({ topicId, moduleId: r.lesson.moduleId, category: "inhaltlich", description: `Falsch beantwortet: ${r.item.prompt.slice(0, 140)}`, origin: "quiz", refId: b.ref });
  return ok(res);
});
