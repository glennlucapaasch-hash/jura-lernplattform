import type { Level } from "./mastery";

export interface SrcRef {
  doc: string; // document stem, e.g. "BGB_2"
  page: number; // PDF page
}

export interface LessonSection {
  id: string;
  title: string;
  short: string;
  long: string;
  src: SrcRef[];
  /** einprägsamer Merksatz zum Abschnitt */
  merksatz?: string;
  /** Normen, die man zu diesem Abschnitt im Gesetz lesen sollte */
  norms?: string[];
}

export interface Definition {
  term: string;
  text: string;
  norm?: string;
  src: SrcRef[];
}

export interface PruefSchema {
  title: string;
  steps: string[];
  src: SrcRef[];
}

interface QuizBase {
  id: string;
  level: Level;
  difficulty: 1 | 2 | 3;
  prompt: string;
  explanation?: string;
  hints?: string[];
  src?: SrcRef[];
}

export type QuizItem =
  | (QuizBase & { type: "mc-single" | "mc-multi"; options: string[]; answer: number[] })
  | (QuizBase & { type: "truefalse"; answer: boolean })
  | (QuizBase & { type: "cloze"; blanks: string[][] })
  | (QuizBase & { type: "match"; pairs: [string, string][] })
  | (QuizBase & { type: "order"; items: string[] })
  | (QuizBase & { type: "free" | "case"; modelAnswer: string; rubric: string[] });

export type GutachtenPart = "obersatz" | "definition" | "subsumtion" | "ergebnis";

export interface CaseStep {
  part: GutachtenPart;
  prompt: string;
  model: string;
  rubric: string[];
  hints?: string[];
}

export interface LessonCase {
  title: string;
  facts: string;
  question: string;
  steps: CaseStep[];
  src: SrcRef[];
}

export interface Flashcard {
  front: string;
  back: string;
  src: SrcRef[];
}

export interface LessonPack {
  id: string;
  /** "drill" = reines Abfragetraining (z. B. MC-Klausurvorbereitung); wird nicht als Tageslektion verwendet */
  kind?: "lesson" | "drill" | "extra"; // extra = Vertiefung aus Begleitmaterial
  moduleId: string;
  ke?: number;
  topicIds: string[];
  title: string;
  estMinutes?: number;
  sections: LessonSection[];
  definitions: Definition[];
  schemas: PruefSchema[];
  quiz: QuizItem[];
  case?: LessonCase;
  flashcards: Flashcard[];
  /** wichtigste Normen der Einheit mit Kurzinhalt */
  kernnormen?: { norm: string; inhalt: string }[];
}

export const QUIZ_TYPE_LABEL: Record<QuizItem["type"], string> = {
  "mc-single": "Multiple Choice (eine Antwort)",
  "mc-multi": "Multiple Choice (mehrere Antworten)",
  truefalse: "Richtig oder falsch",
  cloze: "Lückentext",
  match: "Zuordnung",
  order: "Reihenfolge",
  free: "Freie Antwort",
  case: "Fallfrage",
};
