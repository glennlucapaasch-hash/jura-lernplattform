/**
 * Spaced repetition based on FSRS (ts-fsrs). Cards store their FSRS state as JSON.
 * Ratings: 1 = nicht gewusst, 2 = schwer, 3 = gewusst, 4 = sofort gewusst.
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, maximum_interval: 180, enable_fuzz: false }));

export type SrsRating = 1 | 2 | 3 | 4;

export function newCardState(now = new Date()): Card {
  return createEmptyCard(now);
}

export function serialize(card: Card): string {
  return JSON.stringify(card);
}

export function deserialize(json: string | null | undefined, now = new Date()): Card {
  if (!json) return createEmptyCard(now);
  const raw = JSON.parse(json);
  return { ...raw, due: new Date(raw.due), last_review: raw.last_review ? new Date(raw.last_review) : undefined };
}

export function review(card: Card, rating: SrsRating, now = new Date()): Card {
  const grade = ([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[])[rating - 1];
  return scheduler.next(card, now, grade).card;
}

export function previewIntervals(card: Card, now = new Date()): Record<SrsRating, Date> {
  const p = scheduler.repeat(card, now);
  return { 1: p[Rating.Again].card.due, 2: p[Rating.Hard].card.due, 3: p[Rating.Good].card.due, 4: p[Rating.Easy].card.due };
}

export function formatInterval(due: Date, now = new Date()): string {
  const mins = Math.round((due.getTime() - now.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} Min.`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} Std.`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} ${days === 1 ? "Tag" : "Tage"}`;
  return `${Math.round(days / 30)} Mon.`;
}
