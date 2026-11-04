/**
 * Builds today's guided study session from the plan, lesson content and learning history.
 * Default split (flexible): 10 Wiederholung · 15 neuer Stoff · 15 Übungen · 15 Anwendung · 5 Lernkontrolle.
 * Pure function — inputs are prepared by the server (lib/repo/session.ts).
 */
import type { LessonPack, QuizItem, LessonSection } from "./types";
import { nextDifficulty, type AttemptLite } from "./mastery";

export type BlockKind = "review" | "new" | "exercise" | "application" | "check" | "reading" | "prep" | "hausarbeit";

export interface SessionBlock {
  kind: BlockKind;
  title: string;
  minutes: number;
  topicId?: string;
  lessonId?: string;
  sectionIds?: string[];
  itemIds?: string[];
  cardIds?: string[];
  useCase?: boolean; // application block uses the lesson's Gutachten case
  reading?: { docKey: string; from: number; to: number };
  note?: string;
}

export interface SessionPlan {
  date: string;
  mode: string;
  label?: string;
  totalMinutes: number;
  unitIds: string[];
  blocks: SessionBlock[];
}

export interface UnitInfo {
  id: string;
  title: string;
  moduleId: string;
  docKey: string | null;
  pdfStart: number | null;
  pdfEnd: number | null;
  difficulty: number;
  minutesToday: number;
}

export interface SessionInputs {
  date: string;
  mode: string;
  label?: string;
  milestoneKind?: string;
  minutesPerDay: number;
  units: UnitInfo[]; // today's plan items in order
  lessonFor: (unitId: string) => LessonPack | undefined;
  dueCardIds: string[];
  weakItems: { lessonId: string; itemId: string }[]; // previously failed items of studied topics
  history: Map<string, AttemptLite[]>; // per lesson item id
  prepItems?: { lessonId: string; itemId: string }[];
}

function overlaps(src: { page: number }[] | undefined, from: number | null, to: number | null) {
  if (!src?.length || from == null || to == null) return false;
  return src.some((s) => s.page >= from && s.page <= to);
}

export function sectionsForUnit(pack: LessonPack, u: Pick<UnitInfo, "pdfStart" | "pdfEnd">): LessonSection[] {
  const hit = pack.sections.filter((s) => overlaps(s.src, u.pdfStart, u.pdfEnd));
  return hit.length ? hit : pack.sections;
}

export function itemsForUnit(pack: LessonPack, u: Pick<UnitInfo, "pdfStart" | "pdfEnd">): QuizItem[] {
  const hit = pack.quiz.filter((q) => overlaps(q.src, u.pdfStart, u.pdfEnd));
  return hit.length >= 3 ? hit : pack.quiz;
}

/** Prefer items not yet solved without help; pick around the adaptive difficulty. */
export function pickItems(items: QuizItem[], history: Map<string, AttemptLite[]>, n: number, filter: (q: QuizItem) => boolean): QuizItem[] {
  const pool = items.filter(filter);
  const all = [...history.values()].flat();
  const target = nextDifficulty(all);
  const solved = (q: QuizItem) => (history.get(q.id) ?? []).some((a) => a.score >= 0.8 && a.hintsUsed === 0);
  return [...pool]
    .sort((a, b) => {
      const sa = solved(a) ? 1 : 0;
      const sb = solved(b) ? 1 : 0;
      if (sa !== sb) return sa - sb;
      return Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target);
    })
    .slice(0, n);
}

const CLOSED = new Set(["mc-single", "mc-multi", "truefalse", "cloze", "match", "order"]);

export function buildSession(inp: SessionInputs): SessionPlan {
  const total = inp.minutesPerDay;
  const scale = total / 60;
  const m = (x: number) => Math.max(3, Math.round(x * scale));
  const plan: SessionPlan = { date: inp.date, mode: inp.mode, label: inp.label, totalMinutes: total, unitIds: inp.units.map((u) => u.id), blocks: [] };

  const review: SessionBlock = {
    kind: "review",
    title: "Wiederholung",
    minutes: m(10),
    cardIds: inp.dueCardIds.slice(0, 25),
    itemIds: inp.weakItems.slice(0, 4).map((w) => `${w.lessonId}::${w.itemId}`),
    note: inp.dueCardIds.length === 0 && inp.weakItems.length === 0 ? "Heute ist nichts fällig – die Zeit geht in den neuen Stoff." : undefined,
  };

  if (inp.mode === "hausarbeit") {
    plan.blocks.push({ ...review, minutes: m(10) });
    plan.blocks.push({ kind: "hausarbeit", title: inp.label ?? "Hausarbeit", minutes: total - m(10), note: "Arbeite an deiner Hausarbeit. Der KI-Dozent kann Gliederung und Formulierungen prüfen, schreibt aber keine Lösung für dich." });
    return plan;
  }
  if (inp.mode === "vorbereitung" && inp.milestoneKind === "einsendeaufgabe") {
    plan.blocks.push({ ...review, minutes: m(10) });
    plan.blocks.push({ kind: "hausarbeit", title: inp.label ?? "Einsendeaufgabe", minutes: total - m(10), note: "Heute ist Zeit für die Einsendeaufgabe reserviert. Prüfe Abgabeweg und Frist unter „Termine & Fristen“. Der KI-Dozent kann Gliederung und Formulierungen prüfen, schreibt die Lösung aber nicht für dich." });
    return plan;
  }
  if (inp.mode === "vorbereitung") {
    plan.blocks.push({ ...review, minutes: m(15) });
    plan.blocks.push({ kind: "prep", title: `Prüfungsvorbereitung: ${inp.label ?? ""}`.trim(), minutes: m(30), itemIds: (inp.prepItems ?? []).slice(0, 12).map((w) => `${w.lessonId}::${w.itemId}`), note: "Gemischte Aufgaben aus dem gesamten Modul, Schwerpunkt auf Anwendung." });
    plan.blocks.push({ kind: "application", title: "Klausurtraining", minutes: total - m(15) - m(30), note: "Bearbeite einen Fall unter Zeitdruck im Klausurtrainer." });
    return plan;
  }

  const unit = inp.units[0];
  if (!unit) {
    plan.blocks.push({ ...review, minutes: m(20) });
    plan.blocks.push({ kind: "check", title: "Freies Üben", minutes: total - m(20), note: "Heute ist kein neuer Stoff eingeplant. Nutze Quiz oder Gutachtenstil-Training." });
    return plan;
  }
  const pack = inp.lessonFor(unit.id);
  const hard = unit.difficulty >= 3;
  const hasReview = review.cardIds!.length + review.itemIds!.length > 0;
  const reviewMin = hasReview ? m(10) : 0;
  const newMin = m(hard ? 20 : 15) + (hasReview ? 0 : m(5));
  const exMin = m(hard ? 12 : 15) + (hasReview ? 0 : m(5));
  const appMin = m(hard ? 13 : 15);
  const checkMin = total - reviewMin - newMin - exMin - appMin;

  if (hasReview) plan.blocks.push({ ...review, minutes: reviewMin });

  if (pack) {
    const secs = sectionsForUnit(pack, unit);
    const items = itemsForUnit(pack, unit);
    const hist = inp.history;
    const exercise = pickItems(items, hist, 6, (q) => CLOSED.has(q.type) && q.level !== "apply");
    const used = new Set(exercise.map((q) => q.id));
    const appl = pickItems(pack.quiz, hist, 1, (q) => (q.type === "case" || q.type === "free") && !used.has(q.id));
    appl.forEach((q) => used.add(q.id));
    const check = pickItems(pack.quiz, hist, 3, (q) => !used.has(q.id) && (q.type === "cloze" || q.type === "free" || q.type === "truefalse" || q.type === "mc-multi"));
    plan.blocks.push({ kind: "new", title: `Neuer Stoff: ${unit.title}`, minutes: newMin, topicId: unit.id, lessonId: pack.id, sectionIds: secs.map((s) => s.id) });
    plan.blocks.push({ kind: "exercise", title: "Interaktive Übungen", minutes: exMin, topicId: unit.id, lessonId: pack.id, itemIds: exercise.map((q) => `${pack.id}::${q.id}`) });
    plan.blocks.push({
      kind: "application",
      title: pack.case ? `Anwendung: ${pack.case.title}` : "Anwendung auf einen Fall",
      minutes: appMin,
      topicId: unit.id,
      lessonId: pack.id,
      useCase: !!pack.case,
      itemIds: pack.case ? [] : appl.map((q) => `${pack.id}::${q.id}`),
    });
    plan.blocks.push({ kind: "check", title: "Lernkontrolle", minutes: checkMin, topicId: unit.id, lessonId: pack.id, itemIds: check.map((q) => `${pack.id}::${q.id}`) });
  } else {
    // no prepared lesson yet: guided reading of the original pages; exercises are generated by the KI-Dozent if available
    plan.blocks.push({
      kind: "reading",
      title: `Skript lesen: ${unit.title}`,
      minutes: newMin + exMin,
      topicId: unit.id,
      reading: unit.docKey && unit.pdfStart ? { docKey: unit.docKey, from: unit.pdfStart, to: unit.pdfEnd ?? unit.pdfStart } : undefined,
      note: "Für diesen Abschnitt gibt es noch keine aufbereitete Lerneinheit. Lies die Skriptseiten; mit API-Schlüssel erstellt der KI-Dozent Erklärung und Übungen automatisch.",
    });
    plan.blocks.push({ kind: "application", title: "Verständnisfragen mit dem KI-Dozenten", minutes: appMin, topicId: unit.id });
    plan.blocks.push({ kind: "check", title: "Lernkontrolle", minutes: checkMin, topicId: unit.id });
  }
  return plan;
}
