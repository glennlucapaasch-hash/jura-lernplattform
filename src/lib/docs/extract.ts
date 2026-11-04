/**
 * Text extraction for uploaded study documents.
 * PDF: page-by-page via pdf.js (unpdf build), lines reconstructed from text item positions
 * so that tables of contents with dotted leaders stay intact.
 * DOCX: mammoth (raw text), split into pseudo-pages of ~450 words.
 * TXT: split into pseudo-pages of ~450 words (form feeds respected).
 */
export interface ExtractedPage {
  page: number; // 1-based PDF page (or pseudo page for DOCX/TXT)
  text: string;
}

export interface ExtractionResult {
  kind: "pdf" | "docx" | "txt";
  pages: ExtractedPage[];
  title?: string;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

/** Reassemble lines from pdf.js text items using their y/x coordinates. */
export function itemsToText(items: PdfTextItem[]): string {
  const rows: { y: number; parts: { x: number; w: number; s: string }[] }[] = [];
  for (const it of items) {
    if (!it.str) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const tol = Math.max(2, (it.height || 10) * 0.4);
    let row = rows.find((r) => Math.abs(r.y - y) <= tol);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, w: it.width, s: it.str });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((r) => {
      r.parts.sort((a, b) => a.x - b.x);
      let line = "";
      let lastEnd = -Infinity;
      for (const p of r.parts) {
        if (line && p.x - lastEnd > 1.5 && !line.endsWith(" ") && !p.s.startsWith(" ")) line += " ";
        line += p.s;
        lastEnd = p.x + p.w;
      }
      return line.replace(/\s+$/g, "");
    })
    .filter((l) => l.trim().length > 0)
    .join("\n");
}

export async function extractPdf(data: Uint8Array): Promise<ExtractionResult> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const pages: ExtractedPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push({ page: i, text: itemsToText(content.items as unknown as PdfTextItem[]) });
    page.cleanup();
  }
  let title: string | undefined;
  try {
    const meta = await pdf.getMetadata();
    const t = (meta.info as Record<string, unknown> | undefined)?.Title;
    if (typeof t === "string" && t.trim()) title = t.trim();
  } catch {
    /* metadata optional */
  }
  await (pdf as unknown as { cleanup?: () => Promise<void> }).cleanup?.();
  return { kind: "pdf", pages, title };
}

export function splitPseudoPages(text: string, wordsPerPage = 450): ExtractedPage[] {
  const chunks = text.includes("\f") ? text.split("\f") : [text];
  const pages: ExtractedPage[] = [];
  for (const chunk of chunks) {
    const paras = chunk.split(/\n{2,}/);
    let buf: string[] = [];
    let count = 0;
    const flush = () => {
      if (buf.length) pages.push({ page: pages.length + 1, text: buf.join("\n\n").trim() });
      buf = [];
      count = 0;
    };
    for (const p of paras) {
      const w = p.split(/\s+/).filter(Boolean).length;
      if (count + w > wordsPerPage && count > 0) flush();
      buf.push(p);
      count += w;
    }
    flush();
  }
  return pages.filter((p) => p.text.length > 0);
}

export async function extractDocx(data: Uint8Array): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data) });
  return { kind: "docx", pages: splitPseudoPages(value) };
}

export function extractTxt(data: Uint8Array): ExtractionResult {
  const text = new TextDecoder("utf-8").decode(data);
  return { kind: "txt", pages: splitPseudoPages(text) };
}

export async function extractDocument(filename: string, data: Uint8Array): Promise<ExtractionResult> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return extractPdf(data);
  if (lower.endsWith(".docx")) return extractDocx(data);
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return extractTxt(data);
  throw new Error("Nicht unterstütztes Dateiformat. Erlaubt sind PDF, DOCX und TXT.");
}
