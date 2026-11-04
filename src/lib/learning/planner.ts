/**
 * Study planner — pure, deterministic, unit-tested.
 *
 * Model: every day has `minutesPerDay`. Of that, a fixed share goes to repetition and
 * the end-of-session check; the rest ("topic minutes") moves the syllabus forward.
 * Study units carry an estimated effort and a deadline derived from milestones
 * (Einsendeaufgaben, Hausarbeit, Klausuren). Units are scheduled earliest-deadline-first
 * (optimal for minimising lateness on a single learner) while keeping the order inside
 * a module. Milestones are checked for feasibility and deficits are reported openly.
 * The plan is recomputed from the current state every time, so skipped days and faster
 * or slower progress are absorbed automatically.
 */

export interface PlanUnit {
  id: string;
  moduleId: string;
  title: string;
  order: number; // order inside the module
  estMinutes: number; // full effort (already calibrated)
  remainingMinutes: number;
  examWeight: number; // 1..3
}

export type MilestoneKind = "einsendeaufgabe" | "hausarbeit" | "klausur";

export interface PlanMilestone {
  id: string;
  title: string;
  kind: MilestoneKind;
  moduleId: string;
  date: string; // due date / exam date (YYYY-MM-DD); for hausarbeit: start of phase
  endDate?: string; // for hausarbeit
  unitIds: string[]; // units that must be studied before (date - prepDays)
  prepDays: number; // days before date reserved for exam prep / writing (no new material)
  workMinutes?: number; // explicit work (e.g. writing an Einsendeaufgabe) inside prepDays
}

export interface PlanInput {
  today: string;
  minutesPerDay: number;
  restWeekdays?: number[]; // 0 = Sunday … 6 = Saturday
  skipDates?: string[]; // explicit days off
  units: PlanUnit[];
  milestones: PlanMilestone[];
  focusMode?: boolean; // Kernstoff-Modus: less time for low-weight units
  horizonEnd?: string; // default: last milestone
}

export type DayMode = "lernen" | "vorbereitung" | "hausarbeit" | "frei" | "puffer";

export interface PlanDayItem {
  unitId: string;
  moduleId: string;
  minutes: number;
}

export interface PlanDay {
  date: string;
  mode: DayMode;
  minutes: number;
  topicMinutes: number;
  reviewMinutes: number;
  items: PlanDayItem[];
  milestoneId?: string; // for vorbereitung/hausarbeit days
  label?: string;
}

export interface MilestoneReport {
  id: string;
  title: string;
  date: string;
  requiredMinutes: number;
  availableMinutes: number;
  feasible: boolean;
  deficitMinutes: number;
  projectedDoneDate: string | null; // date the last required unit is finished
  extraMinutesPerDayNeeded: number;
}

export interface PlanResult {
  days: PlanDay[];
  milestones: MilestoneReport[];
  unitFinish: Record<string, string | null>;
  unscheduledMinutes: number;
  warnings: string[];
  totals: { requiredMinutes: number; availableMinutes: number };
}

export const TOPIC_SHARE = 0.75; // 45 of 60 minutes: new material + exercises + application

export function effectiveMinutes(u: PlanUnit, focusMode?: boolean) {
  if (!focusMode) return u.remainingMinutes;
  const f = u.examWeight >= 3 ? 1 : u.examWeight === 2 ? 0.8 : 0.4;
  return Math.round(u.remainingMinutes * f);
}

export function deDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
}

function weekday(date: string) {
  return new Date(date + "T12:00:00Z").getUTCDay();
}

export function buildPlan(input: PlanInput): PlanResult {
  const { today, minutesPerDay } = input;
  const milestones = [...input.milestones].sort((a, b) => a.date.localeCompare(b.date));
  const horizonEnd =
    input.horizonEnd ?? milestones.reduce((m, x) => ((x.endDate ?? x.date) > m ? (x.endDate ?? x.date) : m), today);
  const rest = new Set(input.restWeekdays ?? []);
  const skip = new Set(input.skipDates ?? []);
  const topicPerDay = Math.round(minutesPerDay * TOPIC_SHARE);

  // ---- deadlines per unit: earliest (milestone.date - prepDays) requiring it; fallback = module's last milestone
  const unitDeadline = new Map<string, string>();
  for (const m of milestones) {
    const dl = addDays(m.date, -m.prepDays);
    for (const id of m.unitIds) {
      const cur = unitDeadline.get(id);
      if (!cur || dl < cur) unitDeadline.set(id, dl);
    }
  }
  const lastByModule = new Map<string, string>();
  for (const m of milestones) {
    const dl = addDays(m.date, -m.prepDays);
    if ((lastByModule.get(m.moduleId) ?? "") < dl) lastByModule.set(m.moduleId, dl);
  }

  // ---- queues per module (in module order), with remaining effective minutes
  const remaining = new Map<string, number>();
  const queues = new Map<string, PlanUnit[]>();
  for (const u of [...input.units].sort((a, b) => a.order - b.order)) {
    const eff = effectiveMinutes(u, input.focusMode);
    if (eff <= 0) continue;
    remaining.set(u.id, eff);
    if (!queues.has(u.moduleId)) queues.set(u.moduleId, []);
    queues.get(u.moduleId)!.push(u);
  }
  // Within a module, a later unit cannot be due before an earlier one is done → propagate deadlines backwards.
  for (const q of queues.values()) {
    let next = "9999-12-31";
    for (let i = q.length - 1; i >= 0; i--) {
      const own = unitDeadline.get(q[i].id) ?? lastByModule.get(q[i].moduleId) ?? horizonEnd;
      const dl = own < next ? own : next;
      unitDeadline.set(q[i].id, dl);
      next = dl;
    }
  }

  // ---- classify days
  const dayMode = (date: string): { mode: DayMode; milestoneId?: string; label?: string } => {
    if (skip.has(date) || rest.has(weekday(date))) return { mode: "frei" };
    for (const m of milestones) {
      if (m.kind === "hausarbeit" && m.endDate && date >= m.date && date <= m.endDate)
        return { mode: "hausarbeit", milestoneId: m.id, label: m.title };
    }
    for (const m of milestones) {
      if (m.prepDays > 0 && date > addDays(m.date, -m.prepDays - 1) && date <= m.date && m.kind !== "hausarbeit")
        return { mode: "vorbereitung", milestoneId: m.id, label: m.title };
    }
    return { mode: "lernen" };
  };

  const days: PlanDay[] = [];
  const unitFinish: Record<string, string | null> = {};
  for (const u of input.units) unitFinish[u.id] = remaining.has(u.id) ? null : today;

  const pickModule = (): string | null => {
    let best: string | null = null;
    let bestDl = "";
    for (const [mod, q] of queues) {
      const head = q.find((u) => (remaining.get(u.id) ?? 0) > 0);
      if (!head) continue;
      const dl = unitDeadline.get(head.id) ?? horizonEnd;
      if (best === null || dl < bestDl) {
        best = mod;
        bestDl = dl;
      }
    }
    return best;
  };

  for (let date = today; date <= horizonEnd; date = addDays(date, 1)) {
    const { mode, milestoneId, label } = dayMode(date);
    if (mode !== "lernen") {
      days.push({
        date,
        mode,
        minutes: mode === "frei" ? 0 : minutesPerDay,
        topicMinutes: 0,
        reviewMinutes: mode === "frei" ? 0 : mode === "vorbereitung" ? Math.round(minutesPerDay * 0.25) : 0,
        items: [],
        milestoneId,
        label,
      });
      continue;
    }
    let budget = topicPerDay;
    const items: PlanDayItem[] = [];
    let mod = pickModule();
    while (budget > 0 && mod) {
      const q = queues.get(mod)!;
      const head = q.find((u) => (remaining.get(u.id) ?? 0) > 0);
      if (!head) {
        mod = pickModule();
        continue;
      }
      const left = remaining.get(head.id)!;
      const take = Math.min(left, budget);
      items.push({ unitId: head.id, moduleId: head.moduleId, minutes: take });
      remaining.set(head.id, left - take);
      budget -= take;
      if (left - take <= 0) {
        unitFinish[head.id] = date;
        // Prefer staying in the same module for the rest of the day unless another module is more urgent.
        mod = pickModule();
      }
    }
    days.push({
      date,
      mode: items.length ? "lernen" : "puffer",
      minutes: minutesPerDay,
      topicMinutes: topicPerDay - budget,
      reviewMinutes: minutesPerDay - (topicPerDay - budget),
      items,
    });
  }

  // ---- milestone reports
  const reports: MilestoneReport[] = milestones.map((m) => {
    const dl = addDays(m.date, -m.prepDays);
    const required = m.unitIds.reduce((n, id) => {
      const u = input.units.find((x) => x.id === id);
      return n + (u ? effectiveMinutes(u, input.focusMode) : 0);
    }, 0);
    // capacity before the milestone that is not reserved, counting all earlier-due work of other milestones
    const earlierUnits = new Set<string>();
    for (const [id, d] of unitDeadline) if (d <= dl) earlierUnits.add(id);
    for (const id of m.unitIds) earlierUnits.add(id);
    const requiredCumulative = [...earlierUnits].reduce((n, id) => {
      const u = input.units.find((x) => x.id === id);
      return n + (u ? effectiveMinutes(u, input.focusMode) : 0);
    }, 0);
    const learnDays = days.filter((d) => d.date < dl && (d.mode === "lernen" || d.mode === "puffer")).length;
    const available = learnDays * topicPerDay;
    const finishDates = m.unitIds.map((id) => unitFinish[id]);
    const projected = finishDates.includes(null)
      ? null
      : finishDates.reduce<string>((a, b) => ((b ?? "") > a ? (b as string) : a), today);
    const deficit = Math.max(0, requiredCumulative - available);
    const feasible = projected !== null && projected < dl;
    return {
      id: m.id,
      title: m.title,
      date: m.date,
      requiredMinutes: required,
      availableMinutes: available,
      feasible: feasible && deficit === 0,
      deficitMinutes: deficit,
      projectedDoneDate: projected,
      extraMinutesPerDayNeeded: learnDays > 0 && deficit > 0 ? Math.ceil(deficit / TOPIC_SHARE / learnDays) : 0,
    };
  });

  const unscheduled = [...remaining.values()].reduce((a, b) => a + b, 0);
  const warnings: string[] = [];
  for (const r of reports) {
    if (!r.feasible) {
      warnings.push(
        r.deficitMinutes > 0
          ? `${r.title} (${deDate(r.date)}): Es fehlen rund ${Math.round(r.deficitMinutes / 60)} Std. Lernzeit` +
              (r.extraMinutesPerDayNeeded ? ` – das entspricht etwa ${r.extraMinutesPerDayNeeded} zusätzlichen Minuten pro Lerntag.` : ".")
          : `${r.title} (${deDate(r.date)}): Der Stoff wird voraussichtlich erst am ${r.projectedDoneDate ? deDate(r.projectedDoneDate) : "—"} fertig.`,
      );
    }
  }
  if (unscheduled > 0) warnings.push(`Insgesamt passen rund ${Math.round(unscheduled / 60)} Std. Stoff nicht mehr in den Zeitraum.`);

  const totalRequired = [...queues.values()].flat().reduce((n, u) => n + effectiveMinutes(u, input.focusMode), 0);
  const totalAvailable = days.filter((d) => d.mode === "lernen" || d.mode === "puffer").length * topicPerDay;
  return {
    days,
    milestones: reports,
    unitFinish,
    unscheduledMinutes: unscheduled,
    warnings,
    totals: { requiredMinutes: totalRequired, availableMinutes: totalAvailable },
  };
}
