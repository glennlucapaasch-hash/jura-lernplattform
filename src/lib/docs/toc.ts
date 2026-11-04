/**
 * Table-of-contents parser for German legal study texts.
 * Recognises lines like "§ 2 Rechtsgeschäft und Willenserklärung ........ 5",
 * "II. Der Zugang ..... 30", "1. Überblick .... 6", "a) Grundlagen ... 8", "(1) ... 39".
 * Titles wrapped over several lines are joined.
 */
import type { ExtractedPage } from "./extract";

export interface TocEntry {
  level: number; // 1 = §/A., 2 = I., 3 = 1., 4 = a), 5 = (1)/(a)
  marker: string; // "§ 2", "II.", "1.", "a)"
  title: string;
  printedPage: number;
}

const UNNUMBERED = /^(Vorbemerkung|Vorwort|Einführung|Lösungen|Lösungshinweise|Kurseinheit|Glossar|Anhang|Literaturhinweise|Übungsfall|Fall\s)/i;
const LEADER = /\s*(?:\.\s?){3,}\s*|\s*…\s*/;
const ENTRY_END = /^(.*?)(?:\s*(?:\.\s?){3,}|\s*…)\s*(\d{1,4})\s*$/;

function classify(text: string): { level: number; marker: string; rest: string } | null {
  const t = text.trim();
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(§\s*\d+[a-z]?)\s+(.*)$/))) return { level: 1, marker: m[1].replace(/\s+/g, " ").replace("§", "§ ").replace("§  ", "§ "), rest: m[2] };
  if ((m = t.match(/^([A-H])\.\s+(.*)$/))) return { level: 1, marker: m[1] + ".", rest: m[2] };
  if ((m = t.match(/^((?:X{0,3})(?:IX|IV|V?I{0,3}))\.\s+(.*)$/)) && m[1]) return { level: 2, marker: m[1] + ".", rest: m[2] };
  if ((m = t.match(/^(\d{1,2})\.\s+(.*)$/))) return { level: 3, marker: m[1] + ".", rest: m[2] };
  if ((m = t.match(/^([a-z])[).]\s+(.*)$/))) return { level: 4, marker: m[1] + ")", rest: m[2] };
  if ((m = t.match(/^(([a-z])\2)[).]\s+(.*)$/))) return { level: 5, marker: m[1] + ")", rest: m[3] };
  if ((m = t.match(/^\((([a-z])\2)\)\s+(.*)$/))) return { level: 6, marker: `(${m[1]})`, rest: m[3] };
  if ((m = t.match(/^\((\d{1,2}|[a-z])\)\s+(.*)$/))) return { level: 5, marker: `(${m[1]})`, rest: m[2] };
  return null;
}

/** Parse TOC entries from the first pages of a document. */
export function parseToc(pages: ExtractedPage[], maxPages = 16): TocEntry[] {
  const entries: TocEntry[] = [];
  let pending: { level: number; marker: string; rest: string } | null = null;
  for (const p of pages.slice(0, maxPages)) {
    for (const raw of p.text.split("\n")) {
      const line = raw.replace(/\s+/g, " ").trim();
      if (!line) continue;
      let end = line.match(ENTRY_END);
      // entries without dotted leader: "IV. Die weiteren Voraussetzungen … Anfechtungsfolgen 24"
      if (!end) {
        const m2 = line.match(/^(.*\D)\s(\d{1,3})$/);
        const c2 = m2 ? classify(m2[1]) : null;
        if (m2 && c2 && c2.level <= 2 && p.page <= 8) end = m2;
      }
      if (end) {
        const body = end[1].trim();
        const page = parseInt(end[2], 10);
        let cls = classify(body);
        // "§ 313 BGB" on its own line is the tail of a wrapped title, not a new section
        if (cls && pending && cls.level === 1 && cls.rest.length < 6) cls = null;
        if (cls) {
          entries.push({ level: cls.level, marker: cls.marker, title: clean(cls.rest), printedPage: page });
        } else if (pending) {
          entries.push({ level: pending.level, marker: pending.marker, title: clean(pending.rest + " " + body), printedPage: page });
        } else if (body && UNNUMBERED.test(body)) {
          // unnumbered entry such as "Lösungen zu den Selbsttestaufgaben" or "Vorbemerkung"
          entries.push({ level: 1, marker: "", title: clean(body), printedPage: page });
        }
        pending = null;
      } else {
        const cls = classify(line);
        if (cls && !LEADER.test(line)) pending = cls;
        else if (pending) {
          const p0: { level: number; marker: string; rest: string } = pending;
          pending = { level: p0.level, marker: p0.marker, rest: p0.rest + " " + line };
        }
      }
    }
  }
  return dedupe(entries);
}

function clean(s: string) {
  return s.replace(/\s+/g, " ").replace(/\s*[-–]\s*$/, "").trim();
}

function dedupe(entries: TocEntry[]) {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const k = `${e.marker}|${e.title}|${e.printedPage}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Determine offset between printed page numbers and PDF page indices by searching
 * for the first level-1 heading in the body text. Returns pdfPage - printedPage.
 */
export function detectPageOffset(pages: ExtractedPage[], toc: TocEntry[]): number {
  const candidates = toc.filter((e) => e.level <= 2 && e.title.length > 8).slice(0, 6);
  const votes = new Map<number, number>();
  for (const e of candidates) {
    const needle = normalize(e.title).slice(0, 28);
    for (const p of pages) {
      if (p.page <= 3) continue;
      if (normalize(p.text).includes(needle)) {
        const off = p.page - e.printedPage;
        if (off >= -5 && off <= 40) {
          votes.set(off, (votes.get(off) ?? 0) + 1);
          break;
        }
      }
    }
  }
  let best = 0;
  let bestN = 0;
  for (const [off, n] of votes) if (n > bestN) [best, bestN] = [off, n];
  return best;
}

export function normalize(s: string) {
  return s.toLowerCase().replace(/[„“"'’]/g, "").replace(/\s+/g, " ").trim();
}

export interface TopicNode {
  key: string; // stable within the doc, e.g. "s2", "s2-ii"
  level: number;
  marker: string;
  title: string;
  printedStart: number;
  pdfStart: number;
  pdfEnd: number;
  words: number;
  children: TopicNode[];
}

/** Build a 2-level topic tree (§ → Roman numeral) with page ranges and word counts. */
export function buildTopics(pages: ExtractedPage[], toc: TocEntry[], offset: number): TopicNode[] {
  const lastPage = pages.length;
  const top = toc.filter((e) => e.level <= 2);
  const nodes: TopicNode[] = [];
  let current: TopicNode | null = null;
  top.forEach((e, idx) => {
    const next = top.slice(idx + 1).find((n) => n.level <= e.level);
    const pdfStart = e.printedPage + offset;
    const pdfEnd = next ? Math.max(pdfStart, next.printedPage + offset) : lastPage;
    const key = slug(e.marker || e.title);
    const node: TopicNode = {
      key: e.level === 2 && current ? `${current.key}-${key}` : key,
      level: e.level,
      marker: e.marker,
      title: e.title,
      printedStart: e.printedPage,
      pdfStart,
      pdfEnd,
      words: countWords(pages, pdfStart, pdfEnd),
      children: [],
    };
    if (e.level === 1) {
      nodes.push(node);
      current = node;
    } else if (current) current.children.push(node);
    else nodes.push(node);
  });
  return nodes;
}

export function countWords(pages: ExtractedPage[], from: number, to: number) {
  let n = 0;
  for (const p of pages) if (p.page >= from && p.page <= to) n += p.text.split(/\s+/).filter(Boolean).length;
  return n;
}

export function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/§\s*/g, "s")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "x"
  );
}
