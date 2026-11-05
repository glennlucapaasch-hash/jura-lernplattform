/** Learning status per lesson/unit: what has been read, which quiz items were solved. */
import { db } from "../db";
import { lessonsForTopic, getTopic, type TopicRow } from "./study";
import { sectionsForUnit, itemsForUnit } from "../learning/session";

export function readSections(lessonId: string): Set<string> {
  return new Set((db().prepare("SELECT section_id FROM lesson_reads WHERE lesson_id = ?").all(lessonId) as { section_id: string }[]).map((r) => r.section_id));
}

/** Best result per quiz item of a lesson: true = solved (≥ 80 %), false = attempted but not solved. */
export function itemResults(lessonId: string): Record<string, boolean> {
  const rows = db().prepare("SELECT item_id, MAX(score) best FROM attempts WHERE lesson_id = ? GROUP BY item_id").all(lessonId) as { item_id: string; best: number }[];
  return Object.fromEntries(rows.map((r) => [r.item_id, r.best >= 0.8]));
}

export interface UnitStatus {
  read: boolean;
  readSections: number;
  totalSections: number;
  quizSolved: number;
  quizTried: number;
  quizTotal: number;
  caseDone: boolean;
}

export function unitStatus(t: TopicRow): UnitStatus | null {
  const pack = lessonsForTopic(t.id)[0];
  if (!pack) return null;
  const unit = { pdfStart: t.pdf_start, pdfEnd: t.pdf_end };
  const parent = t.parent_id ? getTopic(t.parent_id) : undefined;
  const whole = !t.parent_id || !parent; // first-level topic: all sections
  const secs = whole ? pack.sections : sectionsForUnit(pack, unit);
  const items = whole ? pack.quiz : itemsForUnit(pack, unit);
  const reads = readSections(pack.id);
  const res = itemResults(pack.id);
  const caseDone = pack.case ? pack.case.steps.every((_, i) => res[`case-${i}`] !== undefined) : false;
  return {
    read: secs.length > 0 && secs.every((s) => reads.has(s.id)),
    readSections: secs.filter((s) => reads.has(s.id)).length,
    totalSections: secs.length,
    quizSolved: items.filter((q) => res[q.id] === true).length,
    quizTried: items.filter((q) => res[q.id] !== undefined).length,
    quizTotal: items.length,
    caseDone,
  };
}
