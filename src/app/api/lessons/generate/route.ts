import { handle, ok, fail } from "@/lib/http";
import { generateLessonForTopic } from "@/lib/ai/generate";
import { saveLesson, getTopic } from "@/lib/repo/study";

export const runtime = "nodejs";
export const maxDuration = 600;

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { topicId: string };
  if (!getTopic(b.topicId)) return fail("Thema nicht gefunden", 404);
  const pack = await generateLessonForTopic(b.topicId);
  saveLesson(pack, "ai");
  return ok({ lessonId: pack.id, title: pack.title, quiz: pack.quiz.length, cards: pack.flashcards.length });
});
