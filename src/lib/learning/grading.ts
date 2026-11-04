/**
 * Deterministic grading for closed question types (no AI, no cost).
 * Free text and case answers are graded by the AI module (see lib/ai/grade.ts).
 */
import type { QuizItem } from "./types";

export type QuizAnswer =
  | { type: "mc-single" | "mc-multi"; selected: number[] }
  | { type: "truefalse"; value: boolean }
  | { type: "cloze"; values: string[] }
  | { type: "match"; mapping: number[] } // mapping[i] = index of right-hand item chosen for left item i
  | { type: "order"; order: string[] };

export interface GradeResult {
  score: number; // 0..1
  correct: boolean;
  details: string[]; // per-part feedback
}

export function normalizeAnswer(s: string) {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/ß/g, "ss")
    .replace(/[„“"'’.,;:!?()]/g, "")
    .replace(/§\s*/g, "§")
    .replace(/\s+/g, " ")
    .trim();
}

/** Small typos (Levenshtein ≤ 1 for words ≥ 6 chars, ≤ 2 for ≥ 12) are tolerated in cloze answers. */
export function fuzzyEqual(a: string, b: string) {
  const x = normalizeAnswer(a);
  const y = normalizeAnswer(b);
  if (x === y) return true;
  const tol = y.length >= 12 ? 2 : y.length >= 6 ? 1 : 0;
  return tol > 0 && levenshtein(x, y) <= tol;
}

export function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function gradeClosed(item: QuizItem, answer: QuizAnswer): GradeResult {
  switch (item.type) {
    case "mc-single":
    case "mc-multi": {
      if (answer.type !== "mc-single" && answer.type !== "mc-multi") throw new Error("answer type mismatch");
      const right = new Set(item.answer);
      const sel = new Set(answer.selected);
      const n = item.options.length;
      let ok = 0;
      for (let i = 0; i < n; i++) if (right.has(i) === sel.has(i)) ok++;
      const exact = ok === n;
      // partial credit only for multi-select, all-or-nothing for single
      const score = item.type === "mc-single" ? (exact ? 1 : 0) : exact ? 1 : Math.max(0, (ok - (n - ok)) / n);
      return { score, correct: exact, details: [] };
    }
    case "truefalse": {
      if (answer.type !== "truefalse") throw new Error("answer type mismatch");
      const c = answer.value === item.answer;
      return { score: c ? 1 : 0, correct: c, details: [] };
    }
    case "cloze": {
      if (answer.type !== "cloze") throw new Error("answer type mismatch");
      const details: string[] = [];
      let ok = 0;
      item.blanks.forEach((accepted, i) => {
        const given = answer.values[i] ?? "";
        const hit = accepted.some((acc) => fuzzyEqual(given, acc));
        if (hit) ok++;
        else details.push(`Lücke ${i + 1}: erwartet „${accepted[0]}“`);
      });
      const score = item.blanks.length ? ok / item.blanks.length : 0;
      return { score, correct: score === 1, details };
    }
    case "match": {
      if (answer.type !== "match") throw new Error("answer type mismatch");
      let ok = 0;
      const details: string[] = [];
      item.pairs.forEach((p, i) => {
        if (answer.mapping[i] === i) ok++;
        else details.push(`„${p[0]}“ gehört zu „${p[1]}“`);
      });
      const score = ok / item.pairs.length;
      return { score, correct: score === 1, details };
    }
    case "order": {
      if (answer.type !== "order") throw new Error("answer type mismatch");
      // score = share of items at the correct position (Kendall-like alternatives would be harsher)
      let ok = 0;
      item.items.forEach((it, i) => {
        if (answer.order[i] === it) ok++;
      });
      const score = ok / item.items.length;
      return { score, correct: score === 1, details: score === 1 ? [] : ["Richtige Reihenfolge: " + item.items.map((x, i) => `${i + 1}. ${x}`).join(" · ")] };
    }
    default:
      throw new Error("Dieser Aufgabentyp wird durch die KI bewertet.");
  }
}

/** Deterministic shuffle so a question looks the same when re-opened within a session. */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const j = Math.abs(h ^ (h >>> 16)) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
