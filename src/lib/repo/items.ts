import { getLesson } from "./study";
import type { QuizItem, LessonPack } from "../learning/types";

/** Resolve "lessonId::itemId" references. */
export function resolveItem(ref: string): { lesson: LessonPack; item: QuizItem } | undefined {
  const [lessonId, itemId] = ref.split("::");
  const lesson = getLesson(lessonId);
  const item = lesson?.quiz.find((q) => q.id === itemId);
  return lesson && item ? { lesson, item } : undefined;
}
