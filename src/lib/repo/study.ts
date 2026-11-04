/** Data access for modules, topics, progress, lessons, attempts and the study plan. */
import { db, now, uid, getSetting } from "../db";
import { ensureSeeded } from "./seed";
import { plannableTopics } from "../docs/curriculum";
import { buildPlan, type PlanMilestone, type PlanUnit, type PlanResult } from "../learning/planner";
import { computeMastery, type AttemptLite, type Level, type TopicMastery } from "../learning/mastery";
import type { LessonPack } from "../learning/types";

export interface ModuleRow {
  id: string;
  title: string;
  short: string;
  description: string;
  color: string;
  sort: number;
}

export interface TopicRow {
  id: string;
  module_id: string;
  doc_id: string | null;
  parent_id: string | null;
  ke: number | null;
  level: number;
  marker: string;
  title: string;
  pdf_start: number | null;
  pdf_end: number | null;
  words: number;
  est_minutes: number;
  difficulty: number;
  exam_weight: number;
  sort: number;
  kind: string;
  placeholder: number;
}

export interface DeadlineRow {
  id: string;
  module_id: string | null;
  kind: string;
  title: string;
  date: string;
  end_date: string | null;
  time: string | null;
  status: "confirmed" | "unconfirmed";
  source: string | null;
  note: string | null;
  required_for_admission: string;
  done: number;
  covers: string | null;
  prep_days: number;
  work_minutes: number | null;
}

export function today(): string {
  // local date of the server (the user's Mac)
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function listModules(): ModuleRow[] {
  ensureSeeded();
  return db().prepare("SELECT * FROM modules ORDER BY sort").all() as ModuleRow[];
}

export function getModule(id: string): ModuleRow | undefined {
  ensureSeeded();
  return db().prepare("SELECT * FROM modules WHERE id = ?").get(id) as ModuleRow | undefined;
}

export function listTopics(moduleId?: string): TopicRow[] {
  ensureSeeded();
  return (
    moduleId
      ? db().prepare("SELECT * FROM topics WHERE module_id = ? ORDER BY sort").all(moduleId)
      : db().prepare("SELECT * FROM topics ORDER BY module_id, sort").all()
  ) as TopicRow[];
}

export function getTopic(id: string): TopicRow | undefined {
  ensureSeeded();
  return db().prepare("SELECT * FROM topics WHERE id = ?").get(id) as TopicRow | undefined;
}

export interface ProgressRow {
  topic_id: string;
  status: string;
  minutes_spent: number;
  first_studied_at: string | null;
  last_studied_at: string | null;
}

export function progressMap(): Map<string, ProgressRow> {
  const rows = db().prepare("SELECT * FROM topic_progress").all() as ProgressRow[];
  return new Map(rows.map((r) => [r.topic_id, r]));
}

export function addStudyMinutes(topicId: string, minutes: number, markStudied = false) {
  const t = now();
  db()
    .prepare(
      `INSERT INTO topic_progress (topic_id, status, minutes_spent, first_studied_at, last_studied_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(topic_id) DO UPDATE SET
         minutes_spent = minutes_spent + excluded.minutes_spent,
         status = CASE WHEN excluded.status = 'studied' THEN 'studied' WHEN status = 'studied' THEN 'studied' ELSE 'learning' END,
         last_studied_at = excluded.last_studied_at`,
    )
    .run(topicId, markStudied ? "studied" : "learning", minutes, t, t);
}

export function setTopicStatus(topicId: string, status: "new" | "learning" | "studied") {
  db()
    .prepare(
      `INSERT INTO topic_progress (topic_id, status, minutes_spent, first_studied_at, last_studied_at) VALUES (?, ?, 0, ?, ?)
       ON CONFLICT(topic_id) DO UPDATE SET status = excluded.status, last_studied_at = excluded.last_studied_at`,
    )
    .run(topicId, status, now(), now());
}

/** Units = second-level sections where available (I., II., …). */
export function studyUnits(moduleId?: string): TopicRow[] {
  const all = listTopics(moduleId);
  return plannableTopics(all.map((t) => ({ ...t, parentId: t.parent_id, estMinutes: t.est_minutes }))).map(
    (t) => all.find((x) => x.id === t.id)!,
  );
}

/** Ratio actual/estimated minutes over studied units (bounded), used to calibrate estimates. */
export function calibration(): number {
  const prog = progressMap();
  let est = 0;
  let act = 0;
  for (const u of studyUnits()) {
    const p = prog.get(u.id);
    if (p?.status === "studied" && p.minutes_spent > 0) {
      est += u.est_minutes;
      act += p.minutes_spent;
    }
  }
  if (est < 60) return 1;
  return Math.min(1.6, Math.max(0.6, act / est));
}

export function listDeadlines(): DeadlineRow[] {
  ensureSeeded();
  return db().prepare("SELECT * FROM deadlines ORDER BY date").all() as DeadlineRow[];
}

export function milestonesFromDeadlines(units: TopicRow[]): PlanMilestone[] {
  return listDeadlines()
    .filter((d) => d.covers && ["einsendeaufgabe", "hausarbeit", "klausur"].includes(d.kind))
    .map((d) => {
      const cov = JSON.parse(d.covers!) as { ke?: number[]; all?: boolean };
      const ids = units
        .filter((u) => u.module_id === d.module_id && (cov.all || (u.ke != null && cov.ke?.includes(u.ke))))
        .map((u) => u.id);
      return {
        id: d.id,
        title: d.title,
        kind: d.kind as PlanMilestone["kind"],
        moduleId: d.module_id ?? "",
        date: d.date,
        endDate: d.end_date ?? undefined,
        unitIds: ids,
        prepDays: d.prep_days,
        workMinutes: d.work_minutes ?? undefined,
      };
    });
}

export interface PlanSettings {
  minutesPerDay: number;
  restWeekdays: number[];
  skipDates: string[];
  focusMode: boolean;
}

export function planSettings(): PlanSettings {
  return {
    minutesPerDay: getSetting("minutesPerDay", 60),
    restWeekdays: getSetting<number[]>("restWeekdays", []),
    skipDates: getSetting<string[]>("skipDates", []),
    focusMode: getSetting("focusMode", false),
  };
}

export function currentPlan(from = today()): { plan: PlanResult; units: TopicRow[]; settings: PlanSettings; calibration: number } {
  const units = studyUnits();
  const prog = progressMap();
  const cal = calibration();
  const settings = planSettings();
  const planUnits: PlanUnit[] = units.map((u, i) => {
    const est = Math.round(u.est_minutes * cal);
    const p = prog.get(u.id);
    const rem = p?.status === "studied" ? 0 : Math.max(0, est - (p?.minutes_spent ?? 0));
    return { id: u.id, moduleId: u.module_id, title: u.title, order: i, estMinutes: est, remainingMinutes: rem, examWeight: u.exam_weight };
  });
  const plan = buildPlan({
    today: from,
    minutesPerDay: settings.minutesPerDay,
    restWeekdays: settings.restWeekdays,
    skipDates: settings.skipDates,
    focusMode: settings.focusMode,
    units: planUnits,
    milestones: milestonesFromDeadlines(units),
  });
  return { plan, units, settings, calibration: cal };
}

// ---------- lessons ----------

export function lessonsForTopic(topicId: string): LessonPack[] {
  ensureSeeded();
  const t = getTopic(topicId);
  const ids = [topicId, t?.parent_id].filter(Boolean) as string[];
  const rows = db().prepare("SELECT json, topic_ids FROM lessons").all() as { json: string; topic_ids: string }[];
  return rows
    .filter((r) => (JSON.parse(r.topic_ids) as string[]).some((x) => ids.includes(x)))
    .map((r) => JSON.parse(r.json) as LessonPack)
    .sort((a, b) => (a.kind && a.kind !== "lesson" ? 1 : 0) - (b.kind && b.kind !== "lesson" ? 1 : 0) || (ids.indexOf(a.topicIds.find((t) => ids.includes(t))!) - ids.indexOf(b.topicIds.find((t) => ids.includes(t))!)));
}

export function getLesson(id: string): LessonPack | undefined {
  ensureSeeded();
  const r = db().prepare("SELECT json FROM lessons WHERE id = ?").get(id) as { json: string } | undefined;
  return r ? JSON.parse(r.json) : undefined;
}

export function listLessons(moduleId?: string): { id: string; title: string; module_id: string; topic_ids: string; origin: string }[] {
  ensureSeeded();
  return (
    moduleId
      ? db().prepare("SELECT id, title, module_id, topic_ids, origin FROM lessons WHERE module_id = ? ORDER BY id").all(moduleId)
      : db().prepare("SELECT id, title, module_id, topic_ids, origin FROM lessons ORDER BY module_id, id").all()
  ) as { id: string; title: string; module_id: string; topic_ids: string; origin: string }[];
}

export function saveLesson(pack: LessonPack, origin: "ai" | "user") {
  db()
    .prepare(
      `INSERT INTO lessons (id, module_id, topic_ids, title, json, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET json = excluded.json, title = excluded.title`,
    )
    .run(pack.id, pack.moduleId, JSON.stringify(pack.topicIds), pack.title, JSON.stringify(pack), origin, now());
  const insCard = db().prepare(
    `INSERT INTO flashcards (id, module_id, topic_id, lesson_id, front, back, src, origin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const has = db().prepare("SELECT COUNT(*) n FROM flashcards WHERE lesson_id = ?").get(pack.id) as { n: number };
  if (!has.n) for (const c of pack.flashcards) insCard.run(uid("fc_"), pack.moduleId, pack.topicIds[0], pack.id, c.front, c.back, JSON.stringify(c.src ?? []), origin, now(), now());
}

// ---------- attempts / mastery ----------

export interface AttemptInput {
  lessonId?: string | null;
  itemId: string;
  topicId?: string | null;
  moduleId?: string | null;
  type: string;
  level: Level;
  difficulty: number;
  score: number;
  hintsUsed: number;
  answer?: unknown;
  feedback?: unknown;
  sessionId?: string | null;
}

export function recordAttempt(a: AttemptInput) {
  const id = uid("at_");
  db()
    .prepare(
      `INSERT INTO attempts (id, lesson_id, item_id, topic_id, module_id, type, level, difficulty, score, correct, hints_used, answer, feedback, session_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      a.lessonId ?? null,
      a.itemId,
      a.topicId ?? null,
      a.moduleId ?? null,
      a.type,
      a.level,
      a.difficulty,
      a.score,
      a.score >= 0.8 ? 1 : 0,
      a.hintsUsed,
      a.answer === undefined ? null : JSON.stringify(a.answer),
      a.feedback === undefined ? null : JSON.stringify(a.feedback),
      a.sessionId ?? null,
      now(),
    );
  return id;
}

export function recordMistake(m: { topicId?: string | null; moduleId?: string | null; category: string; description: string; origin: string; refId?: string }) {
  db()
    .prepare(`INSERT INTO mistakes (id, topic_id, module_id, category, description, origin, ref_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uid("mi_"), m.topicId ?? null, m.moduleId ?? null, m.category, m.description, m.origin, m.refId ?? null, now());
}

/** Mastery per topic, aggregating attempts on the topic and its sub-topics. */
export function masteryByTopic(): Map<string, TopicMastery> {
  const rows = db()
    .prepare("SELECT topic_id, level, score, hints_used, difficulty, created_at FROM attempts WHERE topic_id IS NOT NULL")
    .all() as { topic_id: string; level: Level; score: number; hints_used: number; difficulty: number; created_at: string }[];
  const topics = listTopics();
  const parent = new Map(topics.map((t) => [t.id, t.parent_id]));
  const grouped = new Map<string, AttemptLite[]>();
  for (const r of rows) {
    const a: AttemptLite = { level: r.level, score: r.score, hintsUsed: r.hints_used, difficulty: r.difficulty, createdAt: r.created_at };
    for (const key of [r.topic_id, parent.get(r.topic_id)].filter(Boolean) as string[]) {
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(a);
    }
  }
  const out = new Map<string, TopicMastery>();
  for (const [k, v] of grouped) out.set(k, computeMastery(v));
  return out;
}

export function itemHistory(lessonId: string): Map<string, { score: number; hints: number; at: string }[]> {
  const rows = db()
    .prepare("SELECT item_id, score, hints_used, created_at FROM attempts WHERE lesson_id = ? ORDER BY created_at")
    .all(lessonId) as { item_id: string; score: number; hints_used: number; created_at: string }[];
  const m = new Map<string, { score: number; hints: number; at: string }[]>();
  for (const r of rows) {
    if (!m.has(r.item_id)) m.set(r.item_id, []);
    m.get(r.item_id)!.push({ score: r.score, hints: r.hints_used, at: r.created_at });
  }
  return m;
}

export function formatStage(stage: string) {
  return { neu: "neu", begonnen: "begonnen", gefestigt: "gefestigt", sicher: "sicher" }[stage] ?? stage;
}
