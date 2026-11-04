/**
 * Module registry + conversion of a parsed document structure into study topics.
 * Pure functions (no DB) so they can be unit-tested and reused by scripts.
 */
import type { TopicNode } from "./toc";

export interface ModuleDef {
  id: string; // FernUni module/course number
  prefix: string; // topic id prefix
  title: string;
  short: string;
  color: string;
  description: string;
  aliases: RegExp[]; // to recognise documents
}

export const KNOWN_MODULES: ModuleDef[] = [
  {
    id: "55101",
    prefix: "bgb",
    title: "Allgemeiner Teil des BGB",
    short: "BGB AT",
    color: "indigo",
    description: "Kurs 55101 – Das Rechtsgeschäft und die Instrumente des Privatrechts (Kubis/Eisenhardt)",
    aliases: [/Kurs\s*55101/i, /Allgemeiner Teil des BGB/i],
  },
  {
    id: "55104",
    prefix: "vr",
    title: "Staats- und Verfassungsrecht",
    short: "Verfassungsrecht",
    color: "violet",
    description: "Modul 55104 – Staatsorganisationsrecht, Grundrechte, Verfassungsprozessrecht (Haratsch)",
    aliases: [/Modul\s*55104/i, /Staats-\s*und\s*Verfassungsrecht/i],
  },
  {
    id: "55100",
    prefix: "prop",
    title: "Juristisches Propädeutikum",
    short: "Propädeutikum",
    color: "sky",
    description: "Modul 55100 – Rechtsanwendung, Sachverhalt, Gutachtentechnik, Auslegung (Pilniok)",
    aliases: [/Modul\s*55100/i, /Propädeutikum/i],
  },
  {
    id: "55103",
    prefix: "schr",
    title: "Schuldrecht Allgemeiner Teil",
    short: "Schuldrecht AT",
    color: "emerald",
    description: "Modul 55103 – Schuldrecht Allgemeiner Teil (Unterlagen noch nicht hochgeladen)",
    aliases: [/Kurs\s*55103/i, /Modul\s*55103/i, /Schuldrecht Allgemeiner Teil/i],
  },
  {
    id: "gesetze",
    prefix: "gesetz",
    title: "Gesetzestexte",
    short: "Gesetze",
    color: "slate",
    description: "Normtexte (z. B. Grundgesetz) als Nachschlagequelle für den KI-Dozenten",
    aliases: [/Grundgesetz für die Bundesrepublik Deutschland/i, /Bürgerliches Gesetzbuch/i],
  },
];

export function detectModule(firstPagesText: string): { module?: ModuleDef; ke?: number } {
  const mod = KNOWN_MODULES.find((m) => m.aliases.some((a) => a.test(firstPagesText)));
  const keMatch = firstPagesText.match(/Kurseinheit\s+(\d{1,2})/i);
  const ke = keMatch ? parseInt(keMatch[1], 10) : undefined;
  return { module: mod, ke };
}

/** Topics that are not study content of their own. */
const META = /^(Lösungen|Literatur|Vorwort|Abbildungsverzeichnis|Tabellenverzeichnis|Der Autor|Die Autorin|Kurseinheit\s*\d)/i;
const REFERENCE = /Glossar/i;

export type TopicKind = "study" | "solutions" | "reference" | "meta";

export function topicKind(title: string): TopicKind {
  if (/^Lösungen/i.test(title)) return "solutions";
  if (REFERENCE.test(title)) return "reference";
  if (META.test(title)) return "meta";
  return "study";
}

/** Words of course text an average learner works through per minute with app support (explanation + notes). */
export const DEFAULT_WORDS_PER_MINUTE = 70;

/** Rough difficulty heuristics from the topic title (can be overridden in the UI). */
export function guessDifficulty(title: string): 1 | 2 | 3 {
  if (/(Stellvertretung|Anfechtung|Geschäftsfähig|Abstraktion|Bestätigungsschreiben|Erklärungsbewusst|Willenserklärung|Sittenwidrig|Geschäftsgrundlage|Verfassungsbeschwerde|Normenkontrolle|Organstreit|Gesetzgebungskompetenz|Meinungsstreit)/i.test(title)) return 3;
  if (/(Einleitung|Überblick|Begriff|Entstehung|Einführung|Vorbemerkung)/i.test(title)) return 1;
  return 2;
}

export function guessExamWeight(title: string): 1 | 2 | 3 {
  if (/(Entstehung|Geschichte|Errichtung|Vorgeschichte|Literatur|Exkurs|Seminar)/i.test(title)) return 1;
  if (/(Willenserklärung|Zugang|Angebot|Annahme|Vertrag|Anfechtung|Stellvertretung|Geschäftsfähig|Allgemeine Geschäftsbedingungen|Auslegung|Form|Nichtigkeit|Gutachten|Verfassungsbeschwerde|Organstreit|Normenkontrolle|Demokratie|Rechtsstaat|Bundesstaat|Gesetzgebung)/i.test(title)) return 3;
  return 2;
}

export interface TopicSeed {
  id: string;
  parentId: string | null;
  moduleId: string;
  ke: number | null;
  level: number;
  marker: string;
  title: string;
  kind: TopicKind;
  pdfStart: number;
  pdfEnd: number;
  printedStart: number;
  words: number;
  estMinutes: number;
  difficulty: number;
  examWeight: number;
  sort: number;
}

export function topicsFromTree(
  mod: Pick<ModuleDef, "id" | "prefix">,
  ke: number | null,
  tree: TopicNode[],
  sortBase = 0,
  wpm = DEFAULT_WORDS_PER_MINUTE,
): TopicSeed[] {
  const out: TopicSeed[] = [];
  const base = `${mod.prefix}${ke != null ? `-ke${ke}` : ""}`;
  let sort = sortBase;
  const est = (words: number, difficulty: number) =>
    Math.max(10, Math.round(((words / wpm) * (difficulty === 3 ? 1.25 : difficulty === 1 ? 0.85 : 1)) / 5) * 5);
  for (const n of tree) {
    const kind = topicKind(n.title);
    const difficulty = guessDifficulty(n.title);
    const id = `${base}-${n.key}`;
    out.push({
      id,
      parentId: null,
      moduleId: mod.id,
      ke,
      level: 1,
      marker: n.marker,
      title: n.title,
      kind,
      pdfStart: n.pdfStart,
      pdfEnd: n.pdfEnd,
      printedStart: n.printedStart,
      words: n.words,
      estMinutes: kind === "study" ? est(n.words, difficulty) : 0,
      difficulty,
      examWeight: guessExamWeight(n.title),
      sort: sort++,
    });
    for (const c of n.children) {
      const cd = guessDifficulty(c.title + " " + n.title);
      out.push({
        id: `${base}-${c.key}`,
        parentId: id,
        moduleId: mod.id,
        ke,
        level: 2,
        marker: c.marker,
        title: c.title,
        kind: topicKind(c.title),
        pdfStart: c.pdfStart,
        pdfEnd: c.pdfEnd,
        printedStart: c.printedStart,
        words: c.words,
        estMinutes: kind === "study" ? est(c.words, cd) : 0,
        difficulty: cd,
        examWeight: Math.max(guessExamWeight(c.title), guessExamWeight(n.title) === 3 ? 2 : 1),
        sort: sort++,
      });
    }
  }
  return out;
}

/**
 * Study units used by the planner: the second-level sections (I., II., …) where present,
 * otherwise the first-level section itself.
 */
export function plannableTopics<T extends { id: string; parentId: string | null; kind: string; estMinutes: number }>(topics: T[]): T[] {
  const hasChildren = new Set(topics.filter((t) => t.parentId).map((t) => t.parentId));
  return topics.filter((t) => t.kind === "study" && t.estMinutes > 0 && (t.parentId !== null || !hasChildren.has(t.id)));
}
