/**
 * AI evaluation of free text: short answers, case questions, Gutachten steps and full exam answers.
 * Feedback distinguishes inhaltlich / methodisch / sprachlich and quotes the problematic passage.
 */
import "server-only";
import { z } from "zod";
import { generateStructured } from "./client";
import { evidenceBlock, SOURCE_RULES } from "./sources";
import type { Passage } from "../repo/documents";

export const IssueSchema = z.object({
  quote: z.string().describe("Wörtliches Zitat der problematischen Stelle aus der Antwort des Studierenden (leer, wenn etwas fehlt)"),
  category: z.enum(["inhaltlich", "methodisch", "sprachlich"]),
  severity: z.enum(["leicht", "mittel", "schwer"]),
  explanation: z.string().describe("Warum das fehlerhaft oder ungenau ist"),
  suggestion: z.string().describe("Konkret bessere Formulierung oder fehlender Punkt"),
});

export const FeedbackSchema = z.object({
  score: z.number().min(0).max(1).describe("Erfüllungsgrad der Bewertungskriterien 0..1"),
  verdict: z.enum(["richtig", "teilweise richtig", "falsch"]),
  summary: z.string().describe("2–4 Sätze Rückmeldung, direkt an den Studierenden (du)"),
  rubric: z.array(z.object({ criterion: z.string(), met: z.boolean(), comment: z.string() })),
  issues: z.array(IssueSchema),
  hint: z.string().describe("Ein Hinweis, der weiterhilft, ohne die Lösung zu verraten (leer, wenn richtig)"),
  improved: z.string().describe("Eine mögliche juristisch präzise Formulierung der Antwort"),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

const GRADER = `Du bewertest Antworten eines Jurastudierenden (FernUniversität Hagen, BGB/Öffentliches Recht, erstes Studienjahr).
Bewerte streng, fair und nachvollziehbar anhand der Bewertungskriterien und der Musterlösung. Zitiere problematische Stellen wörtlich.
Unterscheide inhaltliche Fehler (falsches Recht, fehlende Prüfungspunkte, falsche Ergebnisse), methodische Fehler (Gutachtenstil, Aufbau, Obersatz/Definition/Subsumtion/Ergebnis vermischt, Urteilsstil statt Gutachtenstil, fehlende Anspruchsgrundlage) und sprachliche Fehler (Ungenauigkeit, Umgangssprache, Grammatik).
Gleichwertige Lösungswege und andere vertretbare Ansichten sind als richtig zu werten, wenn sie gut begründet sind.
Der Hinweis darf die Lösung nicht verraten. Deine Bewertung ist keine offizielle universitäre Benotung.
${SOURCE_RULES}`;

export async function gradeAnswer(opts: {
  task: string;
  context?: string; // Sachverhalt
  answer: string;
  modelAnswer: string;
  rubric: string[];
  part?: string; // obersatz | definition | subsumtion | ergebnis
  passages?: Passage[];
}): Promise<Feedback> {
  const partNote = opts.part
    ? `\nGeprüft wird nur der Bestandteil „${opts.part}“ des Gutachtens. ${
        {
          obersatz: "Ein Obersatz nennt Anspruchsteller, Anspruchsgegner, Anspruchsinhalt und Anspruchsgrundlage bzw. die zu prüfende Frage – im Konjunktiv („könnte … haben“).",
          definition: "Die Definition muss das maßgebliche Tatbestandsmerkmal präzise und vollständig bestimmen.",
          subsumtion: "Die Subsumtion ordnet die konkreten Sachverhaltsangaben den Definitionsmerkmalen zu – Merkmal für Merkmal, ohne neue Tatsachen zu erfinden.",
          ergebnis: "Das Ergebnis beantwortet den Obersatz im Indikativ und passt zur Subsumtion.",
        }[opts.part] ?? ""
      }`
    : "";
  return generateStructured({
    feature: "grading",
    system: GRADER,
    schema: FeedbackSchema,
    effort: "high",
    user: `${opts.passages ? evidenceBlock(opts.passages) + "\n\n" : ""}<aufgabe>${opts.task}</aufgabe>${opts.context ? `\n<sachverhalt>${opts.context}</sachverhalt>` : ""}${partNote}
<musterloesung>${opts.modelAnswer}</musterloesung>
<kriterien>${opts.rubric.map((r, i) => `${i + 1}. ${r}`).join("\n")}</kriterien>
<antwort_des_studierenden>${opts.answer}</antwort_des_studierenden>`,
  });
}

export const ExamEvalSchema = z.object({
  overall: z.string().describe("Gesamteinschätzung in 4–6 Sätzen"),
  basisCorrect: z.boolean().describe("Wurde die richtige Anspruchs-/Prüfungsgrundlage gewählt?"),
  basisComment: z.string(),
  problems: z.array(z.object({ problem: z.string(), recognized: z.enum(["ja", "teilweise", "nein"]), comment: z.string() })),
  structure: z.string().describe("Aufbau und Gutachtenstil"),
  language: z.string().describe("Sprache und Präzision"),
  issues: z.array(IssueSchema),
  strengths: z.array(z.string()),
  nextSteps: z.array(z.string()).describe("Konkrete Übungsempfehlungen"),
  rubricScore: z.number().min(0).max(1).describe("Erfüllungsgrad der Musterlösungspunkte 0..1 (keine Note)"),
});
export type ExamEval = z.infer<typeof ExamEvalSchema>;

export async function evaluateExam(opts: { facts: string; question: string; solution: string; answer: string; passages: Passage[] }): Promise<ExamEval> {
  return generateStructured({
    feature: "grading",
    system: GRADER + "\nDu korrigierst eine vollständige Klausurbearbeitung. Prüfe insbesondere Anspruchsgrundlage/Prüfungsgrundlage und ob die relevanten Probleme erkannt wurden. Vergib keine Note.",
    schema: ExamEvalSchema,
    effort: "high",
    maxTokens: 24000,
    user: `${evidenceBlock(opts.passages)}\n\n<sachverhalt>${opts.facts}</sachverhalt>\n<fallfrage>${opts.question}</fallfrage>\n<musterloesung>${opts.solution}</musterloesung>\n<bearbeitung>${opts.answer}</bearbeitung>`,
  });
}
