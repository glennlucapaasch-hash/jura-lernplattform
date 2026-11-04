/**
 * Mastery model. Distinguishes five competence levels instead of a single percentage:
 *   recognize  – Wiedererkennen (MC, richtig/falsch)
 *   recall     – aktives Abrufen (Lückentext, Karteikarte, Definition)
 *   understand – Verständnis von Zusammenhängen (Zuordnung, Reihenfolge, Warum-Fragen)
 *   apply      – Anwendung auf einen Sachverhalt (Fallfragen)
 *   formulate  – selbstständiges juristisches Formulieren (Gutachtenstil, Klausur)
 * A topic only counts as "sicher" with evidence on apply AND formulate.
 * Evidence decays over time and is discounted when hints were needed.
 */
export const LEVELS = ["recognize", "recall", "understand", "apply", "formulate"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<Level, string> = {
  recognize: "Wiedererkennen",
  recall: "Abrufen",
  understand: "Verstehen",
  apply: "Anwenden",
  formulate: "Formulieren",
};

export interface AttemptLite {
  level: Level;
  score: number; // 0..1
  hintsUsed: number;
  difficulty: number; // 1..3
  createdAt: string;
}

export interface LevelEvidence {
  level: Level;
  attempts: number;
  evidence: number; // 0..1 weighted, decayed
  achieved: boolean;
}

export type MasteryStage = "neu" | "begonnen" | "gefestigt" | "sicher";

export interface TopicMastery {
  levels: LevelEvidence[];
  stage: MasteryStage;
  needsReview: boolean;
  nextStepLevel: Level | null; // what should be practised next
  attempts: number;
}

const HALF_LIFE_DAYS = 21;

export function hintFactor(hints: number) {
  return Math.max(0.4, 1 - 0.2 * hints);
}

export function computeMastery(attempts: AttemptLite[], now = new Date()): TopicMastery {
  const levels: LevelEvidence[] = LEVELS.map((level) => {
    const as = attempts.filter((a) => a.level === level);
    let wSum = 0;
    let sSum = 0;
    for (const a of as) {
      const ageDays = Math.max(0, (now.getTime() - Date.parse(a.createdAt)) / 86400000);
      const w = Math.pow(0.5, ageDays / HALF_LIFE_DAYS) * (0.8 + 0.2 * a.difficulty);
      wSum += w;
      sSum += w * a.score * hintFactor(a.hintsUsed);
    }
    // shrink towards 0 with few attempts (needs at least ~2 good attempts)
    const evidence = wSum > 0 ? (sSum / wSum) * (wSum / (wSum + 0.8)) : 0;
    return { level, attempts: as.length, evidence, achieved: evidence >= 0.62 };
  });
  const by = Object.fromEntries(levels.map((l) => [l.level, l])) as Record<Level, LevelEvidence>;
  let stage: MasteryStage = "neu";
  if (attempts.length > 0) stage = "begonnen";
  if ((by.recognize.achieved || by.recall.achieved) && (by.understand.achieved || by.apply.achieved)) stage = "gefestigt";
  if (by.apply.achieved && by.formulate.achieved && (by.recall.achieved || by.understand.achieved)) stage = "sicher";

  const lastGood = attempts.filter((a) => a.score >= 0.8).map((a) => Date.parse(a.createdAt));
  const lastAny = attempts.map((a) => Date.parse(a.createdAt));
  const recentFail = attempts.some((a) => a.score < 0.5 && now.getTime() - Date.parse(a.createdAt) < 7 * 86400000);
  const stale = lastAny.length > 0 && now.getTime() - Math.max(...(lastGood.length ? lastGood : lastAny)) > 14 * 86400000;
  const nextStepLevel = LEVELS.find((l) => !by[l].achieved) ?? null;
  return { levels, stage, needsReview: recentFail || (stale && stage !== "neu"), nextStepLevel, attempts: attempts.length };
}

/** Suggested difficulty for the next exercise of a topic, given recent performance. */
export function nextDifficulty(recent: AttemptLite[]): 1 | 2 | 3 {
  const last = recent.slice(-6);
  if (last.length < 3) return 1;
  const avg = last.reduce((n, a) => n + a.score * hintFactor(a.hintsUsed), 0) / last.length;
  const curr = Math.round(last.reduce((n, a) => n + a.difficulty, 0) / last.length);
  if (avg >= 0.85) return Math.min(3, curr + 1) as 1 | 2 | 3;
  if (avg < 0.5) return Math.max(1, curr - 1) as 1 | 2 | 3;
  return Math.max(1, Math.min(3, curr)) as 1 | 2 | 3;
}

export const TYPE_LEVEL: Record<string, Level> = {
  "mc-single": "recognize",
  "mc-multi": "recognize",
  truefalse: "recognize",
  cloze: "recall",
  flashcard: "recall",
  match: "understand",
  order: "understand",
  free: "understand",
  case: "apply",
  "gutachten-obersatz": "formulate",
  "gutachten-definition": "recall",
  "gutachten-subsumtion": "apply",
  "gutachten-ergebnis": "formulate",
  gutachten: "formulate",
  klausur: "formulate",
};
