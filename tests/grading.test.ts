import { describe, it, expect } from "vitest";
import { gradeClosed, fuzzyEqual, seededShuffle } from "@/lib/learning/grading";
import type { QuizItem } from "@/lib/learning/types";

describe("grading", () => {
  const mc: QuizItem = { id: "q", type: "mc-multi", level: "recognize", difficulty: 1, prompt: "", options: ["a", "b", "c", "d"], answer: [0, 2] };
  it("mc-multi exact and partial", () => {
    expect(gradeClosed(mc, { type: "mc-multi", selected: [0, 2] }).correct).toBe(true);
    const p = gradeClosed(mc, { type: "mc-multi", selected: [0] });
    expect(p.correct).toBe(false);
    expect(p.score).toBeGreaterThan(0);
    expect(gradeClosed(mc, { type: "mc-multi", selected: [1, 3] }).score).toBe(0);
  });
  it("cloze tolerates small typos and ß/ss", () => {
    expect(fuzzyEqual("Erklärungsbewustsein", "Erklärungsbewusstsein")).toBe(true);
    expect(fuzzyEqual("Erklärungsbewußtsein", "Erklärungsbewusstsein")).toBe(true);
    expect(fuzzyEqual("Handlungswille", "Geschäftswille")).toBe(false);
    const c: QuizItem = { id: "c", type: "cloze", level: "recall", difficulty: 1, prompt: "{{1}} {{2}}", blanks: [["§ 130"], ["Zugang"]] };
    expect(gradeClosed(c, { type: "cloze", values: ["§130", "zugang"] }).correct).toBe(true);
  });
  it("order and match", () => {
    const o: QuizItem = { id: "o", type: "order", level: "understand", difficulty: 1, prompt: "", items: ["1", "2", "3"] };
    expect(gradeClosed(o, { type: "order", order: ["1", "2", "3"] }).correct).toBe(true);
    expect(gradeClosed(o, { type: "order", order: ["2", "1", "3"] }).score).toBeCloseTo(1 / 3);
    const m: QuizItem = { id: "m", type: "match", level: "understand", difficulty: 1, prompt: "", pairs: [["a", "x"], ["b", "y"]] };
    expect(gradeClosed(m, { type: "match", mapping: [0, 1] }).correct).toBe(true);
    expect(gradeClosed(m, { type: "match", mapping: [1, 0] }).score).toBe(0);
  });
  it("seeded shuffle is deterministic and a permutation", () => {
    const a = seededShuffle([1, 2, 3, 4, 5], "x");
    expect(seededShuffle([1, 2, 3, 4, 5], "x")).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
