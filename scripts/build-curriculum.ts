/**
 * Builds content/curriculum/<moduleId>.json from the original course PDFs.
 * Only structural metadata (titles, page ranges, word counts) is written — no course text.
 * Usage: npx tsx scripts/build-curriculum.ts <pdf> [<pdf> ...]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { extractDocument } from "../src/lib/docs/extract";
import { parseToc, detectPageOffset, buildTopics } from "../src/lib/docs/toc";
import { detectModule, topicsFromTree, type TopicSeed } from "../src/lib/docs/curriculum";

(async () => {
  const byModule = new Map<string, { documents: unknown[]; topics: TopicSeed[] }>();
  for (const f of process.argv.slice(2)) {
    const r = await extractDocument(f, readFileSync(f));
    const head = r.pages.slice(0, 3).map((p) => p.text).join("\n");
    const { module, ke } = detectModule(head);
    if (!module) { console.error("unknown module:", f); continue; }
    const toc = parseToc(r.pages);
    const offset = detectPageOffset(r.pages, toc);
    const entry = byModule.get(module.id) ?? { documents: [], topics: [] };
    const tree = module.id === "gesetze" ? [] : buildTopics(r.pages, toc, offset);
    const topics = topicsFromTree(module, ke ?? null, tree, (ke ?? 0) * 1000);
    const words = r.pages.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
    entry.documents.push({ file: path.basename(f), ke: ke ?? null, pages: r.pages.length, offset, words });
    entry.topics.push(...topics);
    byModule.set(module.id, entry);
    console.log(`${path.basename(f)} → ${module.id} KE ${ke ?? "-"}: ${topics.length} topics, offset ${offset}`);
  }
  mkdirSync("content/curriculum", { recursive: true });
  for (const [id, v] of byModule) {
    v.topics.sort((a, b) => a.sort - b.sort);
    writeFileSync(`content/curriculum/${id}.json`, JSON.stringify({ moduleId: id, generatedAt: new Date().toISOString().slice(0, 10), ...v }, null, 1));
  }
})();
