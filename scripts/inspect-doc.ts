import { readFileSync } from "node:fs";
import { extractDocument } from "../src/lib/docs/extract";
import { parseToc, detectPageOffset, buildTopics } from "../src/lib/docs/toc";
(async () => {
  const f = process.argv[2];
  const r = await extractDocument(f, readFileSync(f));
  const toc = parseToc(r.pages);
  const off = detectPageOffset(r.pages, toc);
  const topics = buildTopics(r.pages, toc, off);
  console.log(JSON.stringify({ pages: r.pages.length, tocEntries: toc.length, offset: off }, null, 0));
  for (const t of topics) { console.log(`${t.marker} ${t.title} [${t.pdfStart}-${t.pdfEnd}] ${t.words}w`); for (const c of t.children) console.log(`   ${c.marker} ${c.title} [${c.pdfStart}-${c.pdfEnd}] ${c.words}w`); }
})();
