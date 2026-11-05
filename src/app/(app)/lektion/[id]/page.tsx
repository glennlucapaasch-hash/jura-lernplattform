import { notFound } from "next/navigation";
import { getLesson, getModule } from "@/lib/repo/study";
import { aiAvailable } from "@/lib/ai/client";
import { readSections, itemResults } from "@/lib/repo/status";
import { LessonView } from "./LessonView";

export default async function LessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const lesson = getLesson(id);
  if (!lesson) notFound();
  return (
    <LessonView lesson={lesson} moduleTitle={getModule(lesson.moduleId)?.title ?? ""} aiReady={aiAvailable()}
      readIds={[...readSections(lesson.id)]} results={itemResults(lesson.id)} initialTab={tab} />
  );
}
