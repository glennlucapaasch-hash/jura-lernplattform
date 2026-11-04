/**
 * Source discipline: build the evidence block for the model and verify its answer afterwards.
 * - Only passages retrieved from the user's own documents are offered as sources [Q1]…[Qn].
 * - Citations to unknown source ids are removed and reported.
 * - Norms (§/Art.) and court decisions that do not occur in the offered passages are flagged.
 */
import type { Passage } from "../repo/documents";

export function evidenceBlock(passages: Passage[]): string {
  if (!passages.length) return "<quellen>\n(keine passenden Stellen in den Studienunterlagen gefunden)\n</quellen>";
  return (
    "<quellen>\n" +
    passages
      .map((p) => `<quelle id="${p.ref}" dokument="${p.docTitle}" seite="${p.printedPage}">\n${p.text.slice(0, 3500)}\n</quelle>`)
      .join("\n") +
    "\n</quellen>"
  );
}

const NORM = /(?:§§?|Art\.)\s*\d+[a-z]?(?:\s*(?:Abs\.|Absatz)\s*\d+)?(?:\s*(?:S\.|Satz)\s*\d+)?(?:\s*(?:Nr\.)\s*\d+)?(?:\s*(?:BGB|GG|HGB|ZPO|StGB|BVerfGG|EGBGB|UWG))?/g;
const DECISION = /\b(?:BGHZ|BVerfGE|RGZ|BAGE|BVerwGE)\s*\d+\s*,\s*\d+|\b(?:BGH|BVerfG|BAG|OLG\s+\w+|LG\s+\w+)\s*,?\s*(?:NJW|JZ|MDR|BB|DB|NZA|ZIP)\s*\d{4}\s*,\s*\d+|\b(?:NJW|JZ|MDR)\s*\d{4}\s*,\s*\d+/g;

export interface SourceCheck {
  cited: string[]; // valid source ids used in the answer
  invalidCitations: string[]; // [Q9] where Q9 was not provided
  unverifiedNorms: string[]; // norms not found in any provided passage
  unverifiedDecisions: string[]; // court decisions not found in any provided passage
  noSources: boolean;
}

function normKey(s: string) {
  // "§ 130 Abs. 1 S. 2 BGB" → "§130" ; "Art. 93 GG" → "art.93"
  const m = s.replace(/\s+/g, "").match(/^(§§?|Art\.)(\d+[a-z]?)/);
  return m ? `${m[1].replace("§§", "§").toLowerCase()}${m[2].toLowerCase()}` : s.toLowerCase();
}

export function checkAnswer(answer: string, passages: Passage[]): SourceCheck {
  const ids = new Set(passages.map((p) => p.ref));
  const used = [...answer.matchAll(/\[(Q\d+)\]/g)].map((m) => m[1]);
  const cited = [...new Set(used.filter((u) => ids.has(u)))];
  const invalidCitations = [...new Set(used.filter((u) => !ids.has(u)))];
  const corpus = passages.map((p) => p.text).join("\n");
  const corpusNorms = new Set([...corpus.matchAll(NORM)].map((m) => normKey(m[0])));
  // "§§ 116 ff." / "§§ 145–157" ranges in the corpus: accept the numbers inside a cited range
  for (const m of corpus.matchAll(/§§\s*(\d+)\s*[-–]\s*(\d+)/g)) {
    for (let n = +m[1]; n <= +m[2] && n - +m[1] < 60; n++) corpusNorms.add(`§${n}`);
  }
  const norms = [...new Set([...answer.matchAll(NORM)].map((m) => m[0].trim()))];
  const unverifiedNorms = norms.filter((n) => !corpusNorms.has(normKey(n)));
  const compact = corpus.replace(/\s+/g, "");
  const decisions = [...new Set([...answer.matchAll(DECISION)].map((m) => m[0].trim()))];
  const unverifiedDecisions = decisions.filter((d) => !compact.includes(d.replace(/\s+/g, "")));
  return { cited, invalidCitations, unverifiedNorms, unverifiedDecisions, noSources: passages.length === 0 };
}

/** Remove citation markers that point to sources that were never provided. */
export function stripInvalidCitations(answer: string, passages: Passage[]): string {
  const ids = new Set(passages.map((p) => p.ref));
  return answer.replace(/\[(Q\d+)\]/g, (all, id) => (ids.has(id) ? all : ""));
}

export const SOURCE_RULES = `Quellenregeln (zwingend):
- Stütze dich in erster Linie auf die Passagen in <quellen>. Belege Aussagen daraus mit der Quellen-ID in eckigen Klammern, z. B. [Q2].
- Erfinde niemals Quellen, Seitenzahlen, Urteile, Aktenzeichen, Fundstellen oder Literatur. Nenne Rechtsprechung nur, wenn sie wörtlich in <quellen> vorkommt.
- Normen (§§, Art.) darfst du nennen, wenn sie in den Quellen vorkommen oder für das Thema eindeutig einschlägig sind; formuliere sie exakt (z. B. „§ 130 Abs. 1 S. 1 BGB“).
- Reichen die Quellen nicht aus, sage das ausdrücklich („Dazu finde ich in deinen Unterlagen nichts Belastbares.“) und kennzeichne Allgemeinwissen deutlich als „allgemeiner Hinweis ohne Beleg in deinen Unterlagen“.
- Weichen die Unterlagen von der herrschenden Meinung ab oder sind sie in sich widersprüchlich, weise darauf hin.`;
