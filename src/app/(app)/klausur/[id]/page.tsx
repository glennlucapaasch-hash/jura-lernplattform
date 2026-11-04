import { notFound } from "next/navigation";
import { getExam } from "@/lib/repo/exams";
import { aiAvailable } from "@/lib/ai/client";
import { ExamRoom } from "./ExamRoom";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getExam(id);
  if (!e) notFound();
  return <ExamRoom exam={{ ...e, solution: e.submitted_at ? e.solution : null, evaluation: e.evaluation ? JSON.parse(e.evaluation) : null, src: JSON.parse(e.src) }} ai={aiAvailable()} />;
}
