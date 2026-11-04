import { PageHeader } from "@/components/ui";
import { listLessons, getLesson, listModules } from "@/lib/repo/study";
import { db } from "@/lib/db";
import { QuizTrainer } from "./QuizTrainer";

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const { module } = await searchParams;
  const lessons = listLessons().map((l) => getLesson(l.id)!).filter(Boolean);
  const stats = db().prepare("SELECT lesson_id || '::' || item_id ref, MAX(score) best, COUNT(*) n FROM attempts WHERE lesson_id IS NOT NULL GROUP BY lesson_id, item_id").all() as { ref: string; best: number; n: number }[];
  return (
    <div>
      <PageHeader title="Quiztrainer" subtitle="Alle Aufgabenformate, drei Schwierigkeitsgrade – Fehler werden gezielt wiederholt" />
      <QuizTrainer lessons={lessons} modules={listModules().filter((m) => m.id !== "gesetze").map((m) => ({ id: m.id, title: m.short }))} stats={Object.fromEntries(stats.map((s) => [s.ref, s]))} initialModule={module} />
    </div>
  );
}
