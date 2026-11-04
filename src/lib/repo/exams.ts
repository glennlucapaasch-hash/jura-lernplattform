import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
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

export interface PreparedExam { id: string; moduleId: string; topicIds: string[]; title: string; difficulty: number; durationMin: number; facts: string; question: string; solution: string; rubric: string[]; src: { doc: string; page: number }[] }

/** Prepared exam cases shipped in content/exams. */
export function preparedExams(moduleId?: string): PreparedExam[] {
  const dir = path.join(process.cwd(), "content", "exams");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => { try { return [JSON.parse(readFileSync(path.join(dir, f), "utf8")) as PreparedExam]; } catch { return []; } })
    .filter((e) => !moduleId || e.moduleId === moduleId)
    .sort((a, b) => a.moduleId.localeCompare(b.moduleId) || a.title.localeCompare(b.title));
}

/** Cases available without AI: prepared exam cases plus the Gutachten cases of the lesson packs. */
export function offlineCases(moduleId?: string) {
  const exams = preparedExams(moduleId).map((e) => ({
    lessonId: `exam:${e.id}`, moduleId: e.moduleId, title: `${e.title} (Klausurfall, ${e.durationMin} Min.)`, facts: e.facts, question: e.question,
    solution: e.solution, rubric: e.rubric, src: e.src, durationMin: e.durationMin, difficulty: e.difficulty,
  }));
  return [...exams, ...listLessons(moduleId)
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
      durationMin: 30,
      difficulty: 1,
    }))];
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
