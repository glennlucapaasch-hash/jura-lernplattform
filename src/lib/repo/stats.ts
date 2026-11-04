import { db } from "../db";
import { LEVELS, type Level } from "../learning/mastery";

function weekStart(iso: string) {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export function attemptsByWeek(weeks = 10) {
  const since = new Date(Date.now() - weeks * 7 * 86400000).toISOString();
  const rows = db().prepare("SELECT level, score, created_at FROM attempts WHERE created_at >= ?").all(since) as { level: Level; score: number; created_at: string }[];
  const map = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const w = weekStart(r.created_at);
    if (!map.has(w)) map.set(w, Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<string, number>);
    map.get(w)![r.level]++;
  }
  return [...map.entries()].sort().map(([week, v]) => ({ week, ...v }));
}

export function levelTotals() {
  return db().prepare("SELECT level, COUNT(*) n, SUM(correct) ok, SUM(CASE WHEN hints_used > 0 THEN 1 ELSE 0 END) hinted FROM attempts GROUP BY level").all() as { level: Level; n: number; ok: number; hinted: number }[];
}

export function cardReviewsByWeek(weeks = 10) {
  const since = new Date(Date.now() - weeks * 7 * 86400000).toISOString();
  const rows = db().prepare("SELECT rating, reviewed_at FROM card_reviews WHERE reviewed_at >= ?").all(since) as { rating: number; reviewed_at: string }[];
  const map = new Map<string, { gewusst: number; nichtGewusst: number }>();
  for (const r of rows) {
    const w = weekStart(r.reviewed_at);
    if (!map.has(w)) map.set(w, { gewusst: 0, nichtGewusst: 0 });
    if (r.rating >= 3) map.get(w)!.gewusst++; else map.get(w)!.nichtGewusst++;
  }
  return [...map.entries()].sort().map(([week, v]) => ({ week, ...v }));
}

export function gutachtenQuality() {
  return db().prepare(`SELECT type, COUNT(*) n, AVG(score) avg,
      AVG(CASE WHEN created_at >= datetime('now','-14 days') THEN score END) recent FROM attempts WHERE type LIKE 'gutachten-%' GROUP BY type`).all() as { type: string; n: number; avg: number; recent: number | null }[];
}

export function mistakeStats() {
  const byCat = db().prepare("SELECT category, COUNT(*) n FROM mistakes GROUP BY category").all() as { category: string; n: number }[];
  const recent = db().prepare("SELECT * FROM mistakes ORDER BY created_at DESC LIMIT 15").all() as { id: string; category: string; description: string; origin: string; created_at: string }[];
  return { byCat, recent };
}

export function studyMinutesByWeek(weeks = 10) {
  const since = new Date(Date.now() - weeks * 7 * 86400000).toISOString().slice(0, 10);
  const rows = db().prepare("SELECT date, minutes FROM study_sessions WHERE date >= ? AND minutes > 0").all(since) as { date: string; minutes: number }[];
  const map = new Map<string, number>();
  for (const r of rows) { const w = weekStart(r.date + "T12:00:00"); map.set(w, (map.get(w) ?? 0) + r.minutes); }
  return [...map.entries()].sort().map(([week, minutes]) => ({ week, minutes: Math.round(minutes) }));
}
