import { describe, it, expect } from "vitest";
import { computeMastery, nextDifficulty, type AttemptLite } from "@/lib/learning/mastery";
const now = new Date("2026-11-10T12:00:00Z");
const a = (level: AttemptLite["level"], score: number, hints = 0, difficulty = 2): AttemptLite => ({ level, score, hintsUsed: hints, difficulty, createdAt: "2026-11-09T12:00:00Z" });

describe("mastery", () => {
  it("MC alone never makes a topic 'sicher'", () => {
    const m = computeMastery([a("recognize", 1), a("recognize", 1), a("recognize", 1), a("recognize", 1)], now);
    expect(m.stage).not.toBe("sicher");
    expect(m.nextStepLevel).toBe("recall");
  });
  it("requires application and formulation for 'sicher'", () => {
    const xs = ["recall", "understand", "apply", "formulate"].flatMap((l) => [a(l as AttemptLite["level"], 1), a(l as AttemptLite["level"], 1)]);
    expect(computeMastery(xs, now).stage).toBe("sicher");
  });
  it("hints reduce evidence", () => {
    const free = computeMastery([a("apply", 1), a("apply", 1)], now).levels.find((l) => l.level === "apply")!.evidence;
    const hinted = computeMastery([a("apply", 1, 3), a("apply", 1, 3)], now).levels.find((l) => l.level === "apply")!.evidence;
    expect(hinted).toBeLessThan(free);
  });
  it("adapts difficulty", () => {
    expect(nextDifficulty([a("recognize", 1, 0, 1), a("recognize", 1, 0, 1), a("recognize", 1, 0, 1)])).toBe(2);
    expect(nextDifficulty([a("recognize", 0, 0, 2), a("recognize", 0, 0, 2), a("recognize", 0.2, 0, 2)])).toBe(1);
  });
});
