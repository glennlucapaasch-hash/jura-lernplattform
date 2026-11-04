import { notFound } from "next/navigation";
import { getLesson, getModule } from "@/lib/repo/study";
import { aiAvailable } from "@/lib/ai/client";
import { LessonView } from "./LessonView";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson) notFound();
  return <LessonView lesson={lesson} moduleTitle={getModule(lesson.moduleId)?.title ?? ""} aiReady={aiAvailable()} />;
}
