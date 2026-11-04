import { describe, it, expect } from "vitest";
import { buildPlan, addDays, type PlanUnit, type PlanMilestone } from "@/lib/learning/planner";

const u = (id: string, moduleId: string, order: number, min: number, w = 2): PlanUnit => ({ id, moduleId, title: id, order, estMinutes: min, remainingMinutes: min, examWeight: w });

describe("planner", () => {
  it("schedules in module order and meets a feasible deadline", () => {
    const units = [u("a1", "A", 1, 90), u("a2", "A", 2, 90)];
    const ms: PlanMilestone[] = [{ id: "m", title: "Klausur A", kind: "klausur", moduleId: "A", date: "2026-11-20", unitIds: ["a1", "a2"], prepDays: 2 }];
    const r = buildPlan({ today: "2026-11-04", minutesPerDay: 60, units, milestones: ms });
    expect(r.unitFinish.a1! < r.unitFinish.a2!).toBe(true);
    expect(r.milestones[0].feasible).toBe(true);
    expect(r.days.find((d) => d.date === "2026-11-19")!.mode).toBe("vorbereitung");
    expect(r.warnings).toHaveLength(0);
  });

  it("reports deficits openly when time is insufficient", () => {
    const units = [u("a1", "A", 1, 2000)];
    const ms: PlanMilestone[] = [{ id: "m", title: "EA", kind: "einsendeaufgabe", moduleId: "A", date: "2026-11-10", unitIds: ["a1"], prepDays: 0 }];
    const r = buildPlan({ today: "2026-11-04", minutesPerDay: 60, units, milestones: ms });
    expect(r.milestones[0].feasible).toBe(false);
    expect(r.milestones[0].deficitMinutes).toBeGreaterThan(0);
    expect(r.milestones[0].extraMinutesPerDayNeeded).toBeGreaterThan(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("uses earliest deadline first across modules", () => {
    const units = [u("b1", "B", 1, 45), u("a1", "A", 1, 45)];
    const ms: PlanMilestone[] = [
      { id: "ma", title: "A", kind: "klausur", moduleId: "A", date: "2026-11-30", unitIds: ["a1"], prepDays: 0 },
      { id: "mb", title: "B", kind: "klausur", moduleId: "B", date: "2026-11-08", unitIds: ["b1"], prepDays: 0 },
    ];
    const r = buildPlan({ today: "2026-11-04", minutesPerDay: 60, units, milestones: ms });
    expect(r.days[0].items[0].unitId).toBe("b1");
  });

  it("blocks Hausarbeit phase and rest days, and recomputes from any start date", () => {
    const units = [u("a1", "A", 1, 450)];
    const ms: PlanMilestone[] = [
      { id: "ha", title: "Hausarbeit", kind: "hausarbeit", moduleId: "A", date: "2026-11-06", endDate: "2026-11-08", unitIds: [], prepDays: 0 },
      { id: "k", title: "Klausur", kind: "klausur", moduleId: "A", date: "2026-11-30", unitIds: ["a1"], prepDays: 0 },
    ];
    const r = buildPlan({ today: "2026-11-04", minutesPerDay: 60, restWeekdays: [0], units, milestones: ms });
    expect(r.days.find((d) => d.date === "2026-11-07")!.mode).toBe("hausarbeit");
    expect(r.days.find((d) => d.date === "2026-11-15")!.mode).toBe("frei"); // Sunday
    const later = buildPlan({ today: addDays("2026-11-04", 5), minutesPerDay: 60, units, milestones: ms });
    expect(later.days[0].date).toBe("2026-11-09");
  });

  it("focus mode reduces low-weight units", () => {
    const units = [u("a1", "A", 1, 100, 1), u("a2", "A", 2, 100, 3)];
    const ms: PlanMilestone[] = [{ id: "k", title: "K", kind: "klausur", moduleId: "A", date: "2026-12-30", unitIds: ["a1", "a2"], prepDays: 0 }];
    const r = buildPlan({ today: "2026-11-04", minutesPerDay: 60, units, milestones: ms, focusMode: true });
    expect(r.totals.requiredMinutes).toBe(140);
  });
});
