import { db, now, uid } from "../db";
import { listLessons, getLesson, recordAttempt, recordMistake } from "./study";

export interface ExamRow {
  id: string; module_id: string; title: string; difficulty: number; facts: string; question: string; solution: string | null;
  duration_min: number; started_at: string | null; submitted_at: string | null; answer: string; evaluation: string | null; src: string; created_at: string;
}

export function listExams(): ExamRow[] {
  return db().prepare("SELECT * FROM exams ORDER BY created_at DESC").all() as ExamRow[];
}
export function getExam(id: string) {
  return db().prepare("SELECT * FROM exams WHERE id = ?").get(id) as ExamRow | undefined;
}

export function createExam(e: { moduleId: string; title: string; difficulty: number; facts: string; question: string; solution: string; durationMin: number; src?: unknown[] }) {
  const id = uid("ex_");
  db().prepare("INSERT INTO exams (id, module_id, title, difficulty, facts, question, solution, duration_min, src, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, e.moduleId, e.title, e.difficulty, e.facts, e.question, e.solution, e.durationMin, JSON.stringify(e.src ?? []), now());
  return id;
}

/** Cases available without AI: the Gutachten cases of the prepared lesson packs. */
export function offlineCases(moduleId?: string) {
  return listLessons(moduleId)
    .map((l) => getLesson(l.id)!)
    .filter((l) => l.case)
    .map((l) => ({
      lessonId: l.id,
      moduleId: l.moduleId,
      title: l.case!.title,
      facts: l.case!.facts,
      question: l.case!.question,
      solution: l.case!.steps.map((s) => `**${s.part[0].toUpperCase() + s.part.slice(1)}:** ${s.model}`).join("\n\n"),
      rubric: l.case!.steps.flatMap((s) => s.rubric),
      src: l.case!.src,
    }));
}

export function saveDraft(id: string, answer: string) {
  db().prepare("UPDATE exams SET answer = ?, started_at = COALESCE(started_at, ?) WHERE id = ? AND submitted_at IS NULL").run(answer, now(), id);
}

export function submitExam(id: string, answer: string) {
  db().prepare("UPDATE exams SET answer = ?, submitted_at = ? WHERE id = ?").run(answer, now(), id);
}

export function storeEvaluation(id: string, evaluation: unknown, score: number, issues: { category: string; explanation: string; severity?: string }[]) {
  const e = getExam(id)!;
  db().prepare("UPDATE exams SET evaluation = ? WHERE id = ?").run(JSON.stringify(evaluation), id);
  recordAttempt({ itemId: `exam:${id}`, moduleId: e.module_id, type: "klausur", level: "formulate", difficulty: e.difficulty, score, hintsUsed: 0 });
  for (const i of issues.filter((x) => x.severity !== "leicht").slice(0, 5))
    recordMistake({ moduleId: e.module_id, category: i.category, description: i.explanation.slice(0, 200), origin: "klausur", refId: id });
}
