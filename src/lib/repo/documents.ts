/** Document library: ingestion pipeline, retrieval (BM25 via SQLite FTS5) and source resolution. */
import { createHash } from "node:crypto";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { db, now, uid, UPLOAD_DIR } from "../db";
import { extractDocument } from "../docs/extract";
import { parseToc, detectPageOffset, buildTopics } from "../docs/toc";
import { detectModule, topicsFromTree, KNOWN_MODULES } from "../docs/curriculum";
import { ensureSeeded } from "./seed";

export interface DocumentRow {
  id: string;
  module_id: string | null;
  filename: string;
  title: string;
  kind: string;
  stored_path: string;
  sha256: string;
  page_count: number;
  page_offset: number;
  word_count: number;
  ke: number | null;
  status: string;
  error: string | null;
  uploaded_at: string;
  doc_key: string | null;
}

export function listDocuments(moduleId?: string): DocumentRow[] {
  ensureSeeded();
  return (
    moduleId
      ? db().prepare("SELECT * FROM documents WHERE module_id = ? ORDER BY ke, filename").all(moduleId)
      : db().prepare("SELECT * FROM documents ORDER BY module_id, ke, filename").all()
  ) as DocumentRow[];
}

export function getDocument(id: string): DocumentRow | undefined {
  return db().prepare("SELECT * FROM documents WHERE id = ?").get(id) as DocumentRow | undefined;
}

export function docByKey(key: string): DocumentRow | undefined {
  return db().prepare("SELECT * FROM documents WHERE doc_key = ? AND status = 'ready' ORDER BY uploaded_at DESC").get(key) as
    | DocumentRow
    | undefined;
}

function canonicalKey(filename: string, moduleId?: string, ke?: number) {
  const mod = KNOWN_MODULES.find((m) => m.id === moduleId);
  if (mod && mod.id !== "gesetze") return `${mod.prefix.toUpperCase()}_${ke ?? 1}`;
  return path.basename(filename).replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "_");
}

export interface IngestResult {
  document: DocumentRow;
  duplicate: boolean;
  topicsCreated: number;
  topicsLinked: number;
}

export async function ingestDocument(filename: string, data: Uint8Array, opts: { moduleId?: string; ke?: number } = {}): Promise<IngestResult> {
  ensureSeeded();
  const d = db();
  const sha = createHash("sha256").update(data).digest("hex");
  const dup = d.prepare("SELECT * FROM documents WHERE sha256 = ?").get(sha) as DocumentRow | undefined;
  if (dup) return { document: dup, duplicate: true, topicsCreated: 0, topicsLinked: 0 };

  const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] ?? "bin").toLowerCase();
  if (!["pdf", "docx", "txt", "md"].includes(ext)) throw new Error("Nicht unterstütztes Dateiformat. Erlaubt sind PDF, DOCX und TXT.");
  const id = uid("doc_");
  const stored = path.join(UPLOAD_DIR, `${id}.${ext}`);
  mkdirSync(UPLOAD_DIR, { recursive: true });
  writeFileSync(stored, data);
  d.prepare(
    `INSERT INTO documents (id, filename, title, kind, stored_path, sha256, status, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, 'processing', ?)`,
  ).run(id, filename, filename.replace(/\.[^.]+$/, ""), ext === "md" ? "txt" : ext, stored, sha, now());

  try {
    const r = await extractDocument(filename, data);
    const head = r.pages.slice(0, 3).map((p) => p.text).join("\n");
    const det = detectModule(head);
    const moduleId = opts.moduleId || det.module?.id || null;
    const ke = opts.ke ?? det.ke ?? null;
    const toc = parseToc(r.pages);
    const offset = r.kind === "pdf" ? detectPageOffset(r.pages, toc) : 0;
    const words = r.pages.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
    const title = buildTitle(moduleId, ke, r.title, filename);
    const key = canonicalKey(filename, moduleId ?? undefined, ke ?? undefined);

    let created = 0;
    let linked = 0;
    d.transaction(() => {
      const insPage = d.prepare("INSERT INTO pages (doc_id, page, text) VALUES (?, ?, ?)");
      const insFts = d.prepare("INSERT INTO pages_fts (text, doc_id, page) VALUES (?, ?, ?)");
      for (const p of r.pages) {
        insPage.run(id, p.page, p.text);
        insFts.run(p.text, id, p.page);
      }
      if (moduleId && moduleId !== "gesetze") {
        const mod = KNOWN_MODULES.find((m) => m.id === moduleId) ?? { id: moduleId, prefix: moduleId };
        const existing = d.prepare("SELECT COUNT(*) n FROM topics WHERE module_id = ? AND ke IS ? AND placeholder = 0").get(moduleId, ke) as { n: number };
        if (existing.n > 0) {
          linked = d.prepare("UPDATE topics SET doc_id = ? WHERE module_id = ? AND ke IS ?").run(id, moduleId, ke).changes;
        } else if (toc.length) {
          const seeds = topicsFromTree(mod, ke, buildTopics(r.pages, toc, offset), (ke ?? 0) * 1000);
          const ins = d.prepare(`INSERT OR IGNORE INTO topics
            (id, module_id, doc_id, parent_id, ke, level, marker, title, pdf_start, pdf_end, printed_start, words, est_minutes, difficulty, exam_weight, sort, kind)
            VALUES (@id, @moduleId, @docId, @parentId, @ke, @level, @marker, @title, @pdfStart, @pdfEnd, @printedStart, @words, @estMinutes, @difficulty, @examWeight, @sort, @kind)`);
          for (const s of seeds) created += ins.run({ ...s, docId: id }).changes;
          // a real Kurseinheit replaces its placeholder
          d.prepare("DELETE FROM topics WHERE module_id = ? AND ke IS ? AND placeholder = 1").run(moduleId, ke);
        }
      }
      d.prepare(
        `UPDATE documents SET module_id = ?, ke = ?, title = ?, page_count = ?, page_offset = ?, word_count = ?, doc_key = ?, status = 'ready' WHERE id = ?`,
      ).run(moduleId, ke, title, r.pages.length, offset, words, key, id);
    })();
    return { document: getDocument(id)!, duplicate: false, topicsCreated: created, topicsLinked: linked };
  } catch (e) {
    d.prepare("UPDATE documents SET status = 'error', error = ? WHERE id = ?").run(String((e as Error).message ?? e), id);
    throw e;
  }
}

function buildTitle(moduleId: string | null, ke: number | null, meta: string | undefined, filename: string) {
  const mod = KNOWN_MODULES.find((m) => m.id === moduleId);
  if (mod && mod.id !== "gesetze") return `${mod.short} – ${ke ? `Kurseinheit ${ke}` : "Studienbrief"}`;
  if (meta && meta.length > 3 && !/^microsoft|untitled/i.test(meta)) return meta;
  return filename.replace(/\.[^.]+$/, "");
}

export function deleteDocument(id: string) {
  const doc = getDocument(id);
  if (!doc) return;
  db().transaction(() => {
    db().prepare("DELETE FROM pages_fts WHERE doc_id = ?").run(id);
    db().prepare("UPDATE topics SET doc_id = NULL WHERE doc_id = ?").run(id);
    db().prepare("DELETE FROM documents WHERE id = ?").run(id);
  })();
  if (existsSync(doc.stored_path)) unlinkSync(doc.stored_path);
}

export function setDocumentModule(id: string, moduleId: string | null, ke: number | null) {
  db().prepare("UPDATE documents SET module_id = ?, ke = ? WHERE id = ?").run(moduleId, ke, id);
}

export function getPage(docId: string, page: number): string | undefined {
  const r = db().prepare("SELECT text FROM pages WHERE doc_id = ? AND page = ?").get(docId, page) as { text: string } | undefined;
  return r?.text;
}

export function getPages(docId: string, from: number, to: number): { page: number; text: string }[] {
  return db().prepare("SELECT page, text FROM pages WHERE doc_id = ? AND page BETWEEN ? AND ? ORDER BY page").all(docId, from, to) as {
    page: number;
    text: string;
  }[];
}

// ---------------- retrieval ----------------

const STOP = new Set(
  "der die das und oder ein eine einer eines einem einen ist sind war wird werden wurde zu zum zur im in am an auf aus bei mit nach von vor für über unter als auch nicht nur wie was wer wo wann warum ich du er sie es wir ihr mir mich dir dich sich so dass daß dem den des kann können muss müssen soll sollen bitte erkläre erklär mal noch schon sehr".split(" "),
);

export function ftsQuery(q: string, mode: "and" | "or" = "or") {
  const tokens = q
    .replace(/[^\p{L}\p{N}§ ]+/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t.toLowerCase()));
  if (!tokens.length) return null;
  const parts = tokens.map((t) => (t === "§" ? null : `"${t.replace(/"/g, "")}"${t.length >= 5 ? "*" : ""}`)).filter(Boolean);
  return parts.join(mode === "and" ? " AND " : " OR ");
}

export interface Passage {
  ref: string; // "Q1"
  docId: string;
  docKey: string | null;
  docTitle: string;
  moduleId: string | null;
  page: number;
  printedPage: number;
  text: string;
  score: number;
}

/** BM25 retrieval of pages. Optional module filter and topic page range boost. */
export function retrieve(query: string, opts: { moduleId?: string | null; limit?: number; pageRange?: { docId: string; from: number; to: number } } = {}): Passage[] {
  ensureSeeded();
  const limit = opts.limit ?? 6;
  const out: Passage[] = [];
  const seen = new Set<string>();
  const push = (r: { doc_id: string; page: number; text: string; score: number; title: string; module_id: string | null; doc_key: string | null; page_offset: number }) => {
    const k = `${r.doc_id}:${r.page}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({
      ref: "",
      docId: r.doc_id,
      docKey: r.doc_key,
      docTitle: r.title,
      moduleId: r.module_id,
      page: r.page,
      printedPage: r.page - r.page_offset,
      text: r.text,
      score: r.score,
    });
  };
  if (opts.pageRange) {
    const rows = db()
      .prepare(
        `SELECT p.doc_id, p.page, p.text, 0 as score, d.title, d.module_id, d.doc_key, d.page_offset FROM pages p JOIN documents d ON d.id = p.doc_id
         WHERE p.doc_id = ? AND p.page BETWEEN ? AND ? ORDER BY p.page LIMIT 3`,
      )
      .all(opts.pageRange.docId, opts.pageRange.from, Math.min(opts.pageRange.to, opts.pageRange.from + 2)) as Parameters<typeof push>[0][];
    rows.forEach(push);
  }
  const q = ftsQuery(query, "or");
  if (q) {
    const rows = db()
      .prepare(
        `SELECT f.doc_id, CAST(f.page AS INTEGER) page, f.text, bm25(pages_fts) score, d.title, d.module_id, d.doc_key, d.page_offset
         FROM pages_fts f JOIN documents d ON d.id = f.doc_id
         WHERE pages_fts MATCH ? AND d.status = 'ready' ${opts.moduleId ? "AND (d.module_id = ? OR d.module_id = 'gesetze')" : ""}
         ORDER BY score LIMIT ?`,
      )
      .all(...([q, ...(opts.moduleId ? [opts.moduleId] : []), limit * 2] as unknown[])) as Parameters<typeof push>[0][];
    rows.forEach(push);
  }
  return out.slice(0, limit).map((p, i) => ({ ...p, ref: `Q${i + 1}` }));
}

export interface SearchHit {
  docId: string;
  docTitle: string;
  page: number;
  printedPage: number;
  snippet: string;
}

export function searchDocuments(query: string, limit = 30): SearchHit[] {
  ensureSeeded();
  const q = ftsQuery(query, "and");
  if (!q) return [];
  return (
    db()
      .prepare(
        `SELECT f.doc_id docId, d.title docTitle, CAST(f.page AS INTEGER) page, CAST(f.page AS INTEGER) - d.page_offset printedPage,
                snippet(pages_fts, 0, '[[', ']]', ' … ', 18) snippet
         FROM pages_fts f JOIN documents d ON d.id = f.doc_id WHERE pages_fts MATCH ? ORDER BY bm25(pages_fts) LIMIT ?`,
      )
      .all(q, limit) as SearchHit[]
  );
}
