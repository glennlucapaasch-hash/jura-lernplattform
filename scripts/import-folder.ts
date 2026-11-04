/**
 * Bulk import of study documents into the local library.
 * Usage: npm run import -- "/Pfad/zum/Ordner"   (PDF, DOCX, TXT; subfolders included)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { ingestDocument } from "../src/lib/repo/documents";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (f.startsWith(".") || f === "__MACOSX") return [];
    return statSync(p).isDirectory() ? walk(p) : /\.(pdf|docx|txt)$/i.test(f) ? [p] : [];
  });
}

(async () => {
  const dir = process.argv[2];
  if (!dir) { console.error('Bitte Ordner angeben: npm run import -- "/Pfad/zum/Ordner"'); process.exit(1); }
  const files = walk(path.resolve(dir));
  console.log(`${files.length} Dateien gefunden.`);
  for (const f of files) {
    try {
      const r = await ingestDocument(path.basename(f), readFileSync(f));
      const d = r.document;
      console.log(`${r.duplicate ? "= bereits vorhanden" : "✓"} ${path.basename(f)} → ${d.title} (${d.page_count} Seiten${d.module_id ? `, Modul ${d.module_id}` : ", ohne Modul"})`);
    } catch (e) {
      console.log(`✗ ${path.basename(f)}: ${(e as Error).message}`);
    }
  }
})();
