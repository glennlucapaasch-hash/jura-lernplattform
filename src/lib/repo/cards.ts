import { db, now, uid } from "../db";
import { deserialize, review, serialize, previewIntervals, formatInterval, type SrsRating } from "../learning/srs";
import { recordAttempt } from "./study";

export interface CardRow {
  id: string; module_id: string | null; topic_id: string | null; lesson_id: string | null; front: string; back: string; src: string;
  origin: string; fsrs: string | null; due: string | null; suspended: number; created_at: string; updated_at: string;
}

export function listCards(opts: { moduleId?: string; due?: boolean; limit?: number } = {}): CardRow[] {
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.moduleId) { where.push("module_id = ?"); args.push(opts.moduleId); }
  if (opts.due) { where.push("suspended = 0 AND due IS NOT NULL AND due <= ?"); args.push(now()); }
  const sql = `SELECT * FROM flashcards ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${opts.due ? "due" : "module_id, topic_id, created_at"} LIMIT ?`;
  return db().prepare(sql).all(...args, opts.limit ?? 500) as CardRow[];
}

export function getCard(id: string) {
  return db().prepare("SELECT * FROM flashcards WHERE id = ?").get(id) as CardRow | undefined;
}

export function cardPreview(c: CardRow) {
  const p = previewIntervals(deserialize(c.fsrs));
  return { 1: formatInterval(p[1]), 2: formatInterval(p[2]), 3: formatInterval(p[3]), 4: formatInterval(p[4]) };
}

export function reviewCard(id: string, rating: SrsRating) {
  const c = getCard(id);
  if (!c) throw new Error("Karte nicht gefunden");
  const next = review(deserialize(c.fsrs), rating);
  db().prepare("UPDATE flashcards SET fsrs = ?, due = ?, updated_at = ? WHERE id = ?").run(serialize(next), next.due.toISOString(), now(), id);
  db().prepare("INSERT INTO card_reviews (id, card_id, rating, reviewed_at) VALUES (?, ?, ?, ?)").run(uid("cr_"), id, rating, now());
  // flashcard recall counts as evidence for "aktives Abrufen"
  recordAttempt({ itemId: `card:${id}`, topicId: c.topic_id, moduleId: c.module_id, type: "flashcard", level: "recall", difficulty: 1, score: [0, 0, 0.6, 0.85, 1][rating], hintsUsed: 0 });
  return { due: next.due.toISOString() };
}

export function createCard(b: { moduleId?: string | null; topicId?: string | null; front: string; back: string; introduce?: boolean }) {
  const id = uid("fc_");
  db().prepare("INSERT INTO flashcards (id, module_id, topic_id, front, back, src, origin, due, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '[]', 'user', ?, ?, ?)")
    .run(id, b.moduleId ?? null, b.topicId ?? null, b.front, b.back, b.introduce === false ? null : now(), now(), now());
  return id;
}

export function updateCard(id: string, b: { front?: string; back?: string; suspended?: boolean; introduce?: boolean }) {
  const c = getCard(id);
  if (!c) throw new Error("Karte nicht gefunden");
  db().prepare("UPDATE flashcards SET front = ?, back = ?, suspended = ?, due = ?, updated_at = ? WHERE id = ?").run(
    b.front ?? c.front, b.back ?? c.back, b.suspended === undefined ? c.suspended : b.suspended ? 1 : 0,
    b.introduce && !c.due ? now() : c.due, now(), id,
  );
}

export function deleteCard(id: string) {
  db().prepare("DELETE FROM flashcards WHERE id = ?").run(id);
}
