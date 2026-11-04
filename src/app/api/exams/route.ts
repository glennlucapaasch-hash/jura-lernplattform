import { handle, ok, fail } from "@/lib/http";
import { listExams, createExam, offlineCases } from "@/lib/repo/exams";
import { aiAvailable } from "@/lib/ai/client";
import { generateExamCase } from "@/lib/ai/generate";
import { studyUnits, progressMap } from "@/lib/repo/study";

export const runtime = "nodejs";
export const maxDuration = 600;

export const GET = handle(async (req: Request) => {
  const moduleId = new URL(req.url).searchParams.get("module") ?? undefined;
  return ok({ exams: listExams(), offline: offlineCases(moduleId).map((c) => ({ lessonId: c.lessonId, moduleId: c.moduleId, title: c.title, facts: c.facts, question: c.question, src: c.src })), ai: aiAvailable() });
});

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { source: "offline" | "ai"; lessonId?: string; moduleId: string; difficulty?: number; durationMin?: number; topicIds?: string[] };
  const durationMin = Math.max(10, Math.min(300, b.durationMin ?? 60));
  if (b.source === "offline") {
    const c = offlineCases().find((x) => x.lessonId === b.lessonId);
    if (!c) return fail("Fall nicht gefunden", 404);
    return ok({ id: createExam({ moduleId: c.moduleId, title: c.title, difficulty: b.difficulty ?? 2, facts: c.facts, question: c.question, solution: c.solution + "\n\n**Bewertungspunkte:**\n" + c.rubric.map((r) => `- ${r}`).join("\n"), durationMin, src: c.src }) });
  }
  const prog = progressMap();
  let topicIds = b.topicIds?.length ? b.topicIds : studyUnits(b.moduleId).filter((u) => prog.get(u.id)?.status === "studied" || prog.get(u.id)?.status === "learning").map((u) => u.id);
  if (!topicIds.length) topicIds = studyUnits(b.moduleId).slice(0, 4).map((u) => u.id);
  const shuffled = [...topicIds].sort(() => Math.random() - 0.5).slice(0, 3);
  const c = await generateExamCase({ moduleId: b.moduleId, topicIds: shuffled, difficulty: (b.difficulty ?? 2) as 1 | 2 | 3, minutes: durationMin });
  const solution = `${c.solution}\n\n**Anspruchs-/Prüfungsgrundlage:** ${c.basis}\n\n**Zu erkennende Probleme:**\n${c.problems.map((p) => `- ${p}`).join("\n")}`;
  return ok({ id: createExam({ moduleId: b.moduleId, title: c.title, difficulty: b.difficulty ?? 2, facts: c.facts, question: c.question, solution, durationMin, src: c.srcRefs }) });
});
