import { db, now, uid } from "../db";
import { buildSession, type SessionPlan, type UnitInfo } from "../learning/session";
import type { AttemptLite, Level } from "../learning/mastery";
import { currentPlan, getTopic, lessonsForTopic, today, addStudyMinutes, listLessons, getLesson } from "./study";
import { docByKey } from "./documents";
import { KNOWN_MODULES } from "../docs/curriculum";

export interface SessionRow {
  id: string;
  date: string;
  plan: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  minutes: number;
  log: string;
}

export function dueCardIds(limit = 50): string[] {
  return (
    db()
      .prepare("SELECT id FROM flashcards WHERE suspended = 0 AND due IS NOT NULL AND due <= ? ORDER BY due LIMIT ?")
      .all(now(), limit) as { id: string }[]
  ).map((r) => r.id);
}

function weakItems(excludeLesson?: string) {
  const rows = db()
    .prepare(
      `SELECT a.lesson_id, a.item_id, a.score FROM attempts a
       JOIN (SELECT lesson_id, item_id, MAX(created_at) m FROM attempts WHERE lesson_id IS NOT NULL GROUP BY lesson_id, item_id) l
         ON l.lesson_id = a.lesson_id AND l.item_id = a.item_id AND l.m = a.created_at
       WHERE a.score < 0.8 ORDER BY a.created_at DESC LIMIT 20`,
    )
    .all() as { lesson_id: string; item_id: string }[];
  return rows.filter((r) => r.lesson_id !== excludeLesson).map((r) => ({ lessonId: r.lesson_id, itemId: r.item_id }));
}

function historyMap(): Map<string, AttemptLite[]> {
  const rows = db()
    .prepare("SELECT item_id, level, score, hints_used, difficulty, created_at FROM attempts WHERE lesson_id IS NOT NULL")
    .all() as { item_id: string; level: Level; score: number; hints_used: number; difficulty: number; created_at: string }[];
  const m = new Map<string, AttemptLite[]>();
  for (const r of rows) {
    if (!m.has(r.item_id)) m.set(r.item_id, []);
    m.get(r.item_id)!.push({ level: r.level, score: r.score, hintsUsed: r.hints_used, difficulty: r.difficulty, createdAt: r.created_at });
  }
  return m;
}

export function buildTodaySession(date = today()): SessionPlan {
  const { plan, settings } = currentPlan(date);
  const day = plan.days[0];
  const units: UnitInfo[] = (day?.items ?? []).map((it) => {
    const t = getTopic(it.unitId)!;
    const mod = KNOWN_MODULES.find((m) => m.id === t.module_id);
    const key = mod ? `${mod.prefix.toUpperCase()}_${t.ke ?? 1}` : null;
    return {
      id: t.id,
      title: `${t.marker ? t.marker + " " : ""}${t.title}`,
      moduleId: t.module_id,
      docKey: key && docByKey(key) ? key : null,
      pdfStart: t.pdf_start,
      pdfEnd: t.pdf_end,
      difficulty: t.difficulty,
      minutesToday: it.minutes,
    };
  });
  const firstLesson = units[0] ? lessonsForTopic(units[0].id)[0] : undefined;
  let prepItems: { lessonId: string; itemId: string }[] | undefined;
  if (day?.mode === "vorbereitung" && day.milestoneId) {
    const ms = db().prepare("SELECT module_id FROM deadlines WHERE id = ?").get(day.milestoneId) as { module_id: string } | undefined;
    prepItems = listLessons(ms?.module_id)
      .flatMap((l) => (getLesson(l.id)?.quiz ?? []).filter((q) => q.level === "apply" || q.level === "understand").map((q) => ({ lessonId: l.id, itemId: q.id })))
      .sort(() => Math.random() - 0.5);
  }
  return buildSession({
    date,
    mode: day?.mode ?? "puffer",
    label: day?.label,
    minutesPerDay: settings.minutesPerDay,
    units,
    lessonFor: (id) => lessonsForTopic(id)[0],
    dueCardIds: dueCardIds(),
    weakItems: weakItems(firstLesson?.id),
    history: historyMap(),
    prepItems,
  });
}

/** Today's session: reuse a running/finished one, otherwise (re)build from the current plan. */
export function getOrCreateTodaySession(): SessionRow {
  const date = today();
  const existing = db().prepare("SELECT * FROM study_sessions WHERE date = ? ORDER BY started_at DESC").get(date) as SessionRow | undefined;
  if (existing && existing.status !== "planned") return existing;
  const plan = buildTodaySession(date);
  if (existing) {
    db().prepare("UPDATE study_sessions SET plan = ? WHERE id = ?").run(JSON.stringify(plan), existing.id);
    return { ...existing, plan: JSON.stringify(plan) };
  }
  const id = uid("ss_");
  db().prepare("INSERT INTO study_sessions (id, date, plan, status) VALUES (?, ?, ?, 'planned')").run(id, date, JSON.stringify(plan));
  return db().prepare("SELECT * FROM study_sessions WHERE id = ?").get(id) as SessionRow;
}

export function getSession(id: string): SessionRow | undefined {
  return db().prepare("SELECT * FROM study_sessions WHERE id = ?").get(id) as SessionRow | undefined;
}

export function startSession(id: string) {
  db().prepare("UPDATE study_sessions SET status = 'running', started_at = COALESCE(started_at, ?) WHERE id = ?").run(now(), id);
}

/** Log a finished block: actual minutes count towards the topic's progress (adaptive plan). */
export function logBlock(id: string, blockIndex: number, minutes: number) {
  const s = getSession(id);
  if (!s) throw new Error("Lerneinheit nicht gefunden");
  const plan = JSON.parse(s.plan) as SessionPlan;
  const log = JSON.parse(s.log) as { block: number; minutes: number; at: string }[];
  if (log.some((l) => l.block === blockIndex)) return;
  log.push({ block: blockIndex, minutes, at: now() });
  const b = plan.blocks[blockIndex];
  if (b?.topicId && ["new", "exercise", "application", "reading"].includes(b.kind)) addStudyMinutes(b.topicId, minutes);
  // once the new material of a lesson has been worked through, its flashcards enter the repetition cycle
  if (b?.kind === "new" && b.lessonId) introduceCards(b.lessonId);
  db().prepare("UPDATE study_sessions SET log = ?, minutes = minutes + ? WHERE id = ?").run(JSON.stringify(log), minutes, id);
}

export function finishSession(id: string, unitStudied: boolean) {
  const s = getSession(id);
  if (!s) return;
  const plan = JSON.parse(s.plan) as SessionPlan;
  if (unitStudied && plan.unitIds[0]) addStudyMinutes(plan.unitIds[0], 0, true);
  db().prepare("UPDATE study_sessions SET status = 'done', finished_at = ? WHERE id = ?").run(now(), id);
}

export function introduceCards(lessonId: string) {
  db().prepare("UPDATE flashcards SET due = ? WHERE lesson_id = ? AND due IS NULL").run(now(), lessonId);
}

export function sessionHistory(limit = 60): SessionRow[] {
  return db().prepare("SELECT * FROM study_sessions WHERE status != 'planned' ORDER BY date DESC LIMIT ?").all(limit) as SessionRow[];
}
