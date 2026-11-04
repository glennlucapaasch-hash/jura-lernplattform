/**
 * Generation of lesson packs and exam cases from the user's own documents.
 * Output is validated: every source reference must point to a page that was actually provided.
 */
import "server-only";
import { z } from "zod";
import { generateStructured } from "./client";
import { SOURCE_RULES } from "./sources";
import { docByKey, getPages } from "../repo/documents";
import { getTopic, listTopics } from "../repo/study";
import { KNOWN_MODULES } from "../docs/curriculum";
import type { LessonPack, QuizItem, SrcRef } from "../learning/types";

const Src = z.array(z.object({ page: z.number().int() })).describe("Seiten (PDF-Seitenzahl wie im Tag <seite nr>) als Beleg");

const FlatItem = z.object({
  type: z.enum(["mc-single", "mc-multi", "truefalse", "cloze", "match", "order", "free", "case"]),
  level: z.enum(["recognize", "recall", "understand", "apply", "formulate"]),
  difficulty: z.number().int().min(1).max(3),
  prompt: z.string().describe("Bei cloze mit Platzhaltern {{1}}, {{2}} …; bei mc-multi muss angegeben sein, wie viele Antworten zu wählen sind"),
  options: z.array(z.string()).describe("mc: genau 4 plausible Optionen, sonst leer"),
  answer: z.array(z.number().int()).describe("mc: Indizes der richtigen Optionen, sonst leer"),
  answerBool: z.boolean().describe("nur truefalse relevant"),
  blanks: z.array(z.array(z.string())).describe("cloze: je Lücke akzeptierte Lösungen, sonst leer"),
  pairs: z.array(z.array(z.string())).describe("match: Paare [links, rechts], sonst leer"),
  items: z.array(z.string()).describe("order: Elemente in RICHTIGER Reihenfolge, sonst leer"),
  modelAnswer: z.string().describe("free/case: Musterantwort, sonst leer"),
  rubric: z.array(z.string()).describe("free/case: Bewertungskriterien, sonst leer"),
  explanation: z.string(),
  hints: z.array(z.string()).describe("1–3 gestufte Hinweise, die die Lösung nicht verraten"),
  src: Src,
});

const PackSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({ title: z.string(), short: z.string(), long: z.string().describe("ausführlich, Markdown, mit Beispiel aus dem Skript"), src: Src })),
  definitions: z.array(z.object({ term: z.string(), text: z.string(), norm: z.string(), src: Src })),
  schemas: z.array(z.object({ title: z.string(), steps: z.array(z.string()), src: Src })),
  quiz: z.array(FlatItem),
  case: z.object({
    title: z.string(),
    facts: z.string(),
    question: z.string(),
    steps: z.array(z.object({ part: z.enum(["obersatz", "definition", "subsumtion", "ergebnis"]), prompt: z.string(), model: z.string(), rubric: z.array(z.string()), hints: z.array(z.string()) })),
    src: Src,
  }),
  flashcards: z.array(z.object({ front: z.string(), back: z.string(), src: Src })),
});

const AUTHOR = `Du bist Autor von Lernmaterial für Jurastudierende der FernUniversität in Hagen. Du erstellst aus den bereitgestellten Skriptseiten eine vollständige Lerneinheit.
Regeln:
- Ausschließlich auf Grundlage der bereitgestellten Seiten. Behalte Begriffe und Systematik des Skripts bei. Vereinfachungen dürfen die rechtliche Bedeutung nicht verändern.
- Jede Erklärung, Definition, Frage und Karte erhält Seitenbelege (src) – nur Seiten, die bereitgestellt wurden.
- Bevorzuge Beispiele, Fälle und Selbsttestaufgaben aus dem Skript.
- 3–5 Abschnitte (kurz + ausführlich), 4–8 Definitionen, mindestens 1 Prüfungsschema, 12–16 Quizfragen, die alle acht Typen und alle fünf Kompetenzstufen abdecken (falsche MC-Optionen fachlich plausibel), 1 Gutachtenstil-Fall in vier Schritten (Obersatz im Konjunktiv, Definition, Subsumtion, Ergebnis), 8–12 Karteikarten.
${SOURCE_RULES}`;

function toItem(x: z.infer<typeof FlatItem>, i: number, src: (s: { page: number }[]) => SrcRef[]): QuizItem | null {
  const base = { id: `g${i + 1}`, level: x.level, difficulty: x.difficulty as 1 | 2 | 3, prompt: x.prompt, explanation: x.explanation, hints: x.hints, src: src(x.src) };
  switch (x.type) {
    case "mc-single":
    case "mc-multi":
      if (x.options.length < 2 || !x.answer.length || x.answer.some((a) => a < 0 || a >= x.options.length)) return null;
      return { ...base, type: x.answer.length > 1 ? "mc-multi" : "mc-single", options: x.options, answer: x.answer };
    case "truefalse":
      return { ...base, type: "truefalse", answer: x.answerBool };
    case "cloze": {
      const n = (x.prompt.match(/\{\{\d+\}\}/g) ?? []).length;
      if (!n || x.blanks.length !== n) return null;
      return { ...base, type: "cloze", blanks: x.blanks };
    }
    case "match":
      if (x.pairs.length < 2 || x.pairs.some((p) => p.length !== 2)) return null;
      return { ...base, type: "match", pairs: x.pairs as [string, string][] };
    case "order":
      if (x.items.length < 3) return null;
      return { ...base, type: "order", items: x.items };
    default:
      if (!x.modelAnswer) return null;
      return { ...base, type: x.type, modelAnswer: x.modelAnswer, rubric: x.rubric };
  }
}

export async function generateLessonForTopic(topicId: string): Promise<LessonPack> {
  const topic = getTopic(topicId);
  if (!topic) throw new Error("Thema nicht gefunden");
  // generate for the first-level section (§) so that one pack covers its sub-sections
  const root = topic.parent_id ? getTopic(topic.parent_id)! : topic;
  const mod = KNOWN_MODULES.find((m) => m.id === root.module_id);
  const key = mod ? `${mod.prefix.toUpperCase()}_${root.ke ?? 1}` : "";
  const doc = docByKey(key);
  if (!doc || !root.pdf_start) throw new Error("Für dieses Thema ist das Originaldokument noch nicht in der Bibliothek. Bitte zuerst hochladen.");
  const to = Math.min(root.pdf_end ?? root.pdf_start, root.pdf_start + 24);
  const pages = getPages(doc.id, root.pdf_start, to);
  const allowed = new Set(pages.map((p) => p.page));
  const src = (s: { page: number }[]) => s.filter((x) => allowed.has(x.page)).map((x) => ({ doc: key, page: x.page }));
  const text = pages.map((p) => `<seite nr="${p.page}">\n${p.text}\n</seite>`).join("\n");
  const subs = listTopics(root.module_id).filter((t) => t.parent_id === root.id).map((t) => `${t.marker} ${t.title} (S. ${t.pdf_start}–${t.pdf_end})`);
  const out = await generateStructured({
    feature: "generation",
    system: AUTHOR,
    schema: PackSchema,
    effort: "high",
    maxTokens: 32000,
    user: `Thema: ${root.marker} ${root.title} (${mod?.title ?? root.module_id}, Kurseinheit ${root.ke ?? "–"})\nGliederung: ${subs.join("; ") || "—"}\n\n${text}`,
  });
  const pack: LessonPack = {
    id: `gen-${root.id}`,
    moduleId: root.module_id,
    ke: root.ke ?? undefined,
    topicIds: [root.id],
    title: out.title,
    sections: out.sections.map((s, i) => ({ id: `s${i + 1}`, title: s.title, short: s.short, long: s.long, src: src(s.src) })),
    definitions: out.definitions.map((d) => ({ term: d.term, text: d.text, norm: d.norm || undefined, src: src(d.src) })),
    schemas: out.schemas.map((s) => ({ title: s.title, steps: s.steps, src: src(s.src) })),
    quiz: out.quiz.map((q, i) => toItem(q, i, src)).filter((q): q is QuizItem => !!q),
    case: { ...out.case, src: src(out.case.src) },
    flashcards: out.flashcards.map((c) => ({ front: c.front, back: c.back, src: src(c.src) })),
  };
  return pack;
}

const ExamCaseSchema = z.object({
  title: z.string(),
  facts: z.string().describe("Klausursachverhalt, 150–500 Wörter"),
  question: z.string(),
  solution: z.string().describe("Ausführliche Musterlösung im Gutachtenstil mit Gliederung (Markdown)"),
  problems: z.array(z.string()).describe("Die zu erkennenden Probleme"),
  basis: z.string().describe("Richtige Anspruchs- bzw. Prüfungsgrundlage(n)"),
  src: Src,
});
export type ExamCase = z.infer<typeof ExamCaseSchema> & { srcRefs: SrcRef[] };

export async function generateExamCase(opts: { moduleId: string; topicIds: string[]; difficulty: 1 | 2 | 3; minutes: number }): Promise<ExamCase> {
  const mod = KNOWN_MODULES.find((m) => m.id === opts.moduleId);
  const chunks: string[] = [];
  const allowed = new Map<number, string>();
  for (const id of opts.topicIds.slice(0, 4)) {
    const t = getTopic(id);
    if (!t?.pdf_start || !mod) continue;
    const key = `${mod.prefix.toUpperCase()}_${t.ke ?? 1}`;
    const doc = docByKey(key);
    if (!doc) continue;
    for (const p of getPages(doc.id, t.pdf_start, Math.min(t.pdf_end ?? t.pdf_start, t.pdf_start + 6))) {
      chunks.push(`<seite nr="${p.page}" dokument="${key}">\n${p.text}\n</seite>`);
      allowed.set(p.page, key);
    }
  }
  if (!chunks.length) throw new Error("Für die gewählten Themen sind noch keine Originaldokumente in der Bibliothek.");
  const out = await generateStructured({
    feature: "generation",
    system: `Du erstellst realistische Übungsklausuren für das Jurastudium (FernUniversität Hagen) auf Grundlage der bereitgestellten Skriptseiten. Schwierigkeitsgrad ${opts.difficulty} von 3, Bearbeitungszeit ${opts.minutes} Minuten.\n${SOURCE_RULES}`,
    schema: ExamCaseSchema,
    effort: "high",
    maxTokens: 24000,
    user: chunks.join("\n").slice(0, 120000),
  });
  return { ...out, srcRefs: out.src.filter((s) => allowed.has(s.page)).map((s) => ({ doc: allowed.get(s.page)!, page: s.page })) };
}
