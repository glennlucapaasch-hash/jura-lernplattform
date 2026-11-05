/**
 * Validates lesson packs (content/lessons/*.json) and exam cases (content/exams/*.json).
 * Usage: npx tsx scripts/validate-content.ts [file ...]   (no args = all)
 * Checks structure, answer indices, cloze blanks, topic ids, and that every src page lies inside
 * the document's page range of the pack's topics (±1 page tolerance).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const cur = ["55101", "55104", "55100"].flatMap((m) => JSON.parse(readFileSync(`content/curriculum/${m}.json`, "utf8")).topics) as {
  id: string; moduleId: string; ke: number | null; pdfStart: number | null; pdfEnd: number | null; parentId: string | null;
}[];
const byId = new Map(cur.map((t) => [t.id, t]));
const PREFIX: Record<string, string> = { "55101": "BGB", "55104": "VR", "55100": "PROP" };
const TYPES = ["mc-single", "mc-multi", "truefalse", "cloze", "match", "order", "free", "case"];
const LEVELS = ["recognize", "recall", "understand", "apply", "formulate"];

let failed = 0;
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [...readdirSync("content/lessons").map((f) => `content/lessons/${f}`), ...readdirSync("content/exams").map((f) => `content/exams/${f}`)];

for (const f of files.filter((x) => x.endsWith(".json"))) {
  const errs: string[] = [];
  const warn: string[] = [];
  let j: any;
  try { j = JSON.parse(readFileSync(f, "utf8")); } catch (e) { console.log(`✗ ${f}: invalid JSON – ${(e as Error).message}`); failed++; continue; }
  const isExam = f.includes("content/exams/");
  const topics: string[] = isExam ? j.topicIds ?? [] : j.topicIds ?? [];
  for (const t of topics) if (!byId.has(t)) errs.push(`unknown topicId ${t}`);
  const ranges = topics.map((t) => byId.get(t)).filter(Boolean).map((t) => ({ key: `${PREFIX[t!.moduleId]}_${t!.ke ?? 1}`, from: t!.pdfStart ?? 0, to: t!.pdfEnd ?? 9999 }));
  const checkSrc = (src: any, where: string, required = true) => {
    if (!Array.isArray(src) || !src.length) { if (required) errs.push(`${where}: missing src`); return; }
    for (const s of src) {
      if (typeof s.doc !== "string" || typeof s.page !== "number") { errs.push(`${where}: bad src ${JSON.stringify(s)}`); continue; }
      if (s.doc.startsWith("EXTRA_")) continue; // Begleitmaterial (Folien, Merkblätter) ohne Seitenbereich
      const ok = ranges.some((r) => r.key === s.doc && s.page >= r.from - 1 && s.page <= r.to + 1);
      const solutionsPage = s.page > (Math.max(...ranges.filter((r) => r.key === s.doc).map((r) => r.to)) || 0);
      if (!ok && !(solutionsPage && ranges.some((r) => r.key === s.doc))) errs.push(`${where}: src ${s.doc} p.${s.page} outside topic pages`);
    }
  };
  if (isExam) {
    for (const k of ["id", "moduleId", "title", "facts", "question", "solution"]) if (typeof j[k] !== "string" || !j[k]) errs.push(`missing ${k}`);
    if (!Array.isArray(j.rubric) || j.rubric.length < 3) errs.push("rubric needs ≥3 points");
    if (![1, 2, 3].includes(j.difficulty)) errs.push("difficulty 1..3");
    if (typeof j.durationMin !== "number") errs.push("durationMin");
    checkSrc(j.src, "exam");
  } else {
    for (const k of ["id", "moduleId", "title"]) if (typeof j[k] !== "string" || !j[k]) errs.push(`missing ${k}`);
    if (path.basename(f, ".json") !== j.id) errs.push(`file name must equal id (${j.id})`);
    if (!Array.isArray(j.sections) || j.sections.length < (j.kind === "drill" ? 1 : 3)) errs.push("≥3 sections");
    (j.sections ?? []).forEach((s: any, i: number) => {
      if (!s.id || !s.title || !s.short || !s.long) errs.push(`section ${i} incomplete`);
      checkSrc(s.src, `section ${s.id}`);
      if (s.merksatz !== undefined && (typeof s.merksatz !== "string" || s.merksatz.split(/\s+/).length > 30)) errs.push(`section ${s.id}: merksatz too long`);
      if (s.norms !== undefined && (!Array.isArray(s.norms) || s.norms.some((n: unknown) => typeof n !== "string" || !/(§|Art\.)/.test(n as string)))) errs.push(`section ${s.id}: norms must be citations with § or Art.`);
    });
    if (j.kernnormen !== undefined && (!Array.isArray(j.kernnormen) || j.kernnormen.some((k: any) => !k.norm || !k.inhalt))) errs.push("kernnormen entries need norm + inhalt");
    (j.definitions ?? []).forEach((d: any, i: number) => { if (!d.term || !d.text) errs.push(`definition ${i} incomplete`); checkSrc(d.src, `definition ${d.term}`); });
    if (!j.schemas?.length) warn.push("no Prüfungsschema");
    (j.schemas ?? []).forEach((s: any, i: number) => { if (!s.title || !s.steps?.length) errs.push(`schema ${i} incomplete`); checkSrc(s.src, `schema ${i}`); });
    const ids = new Set<string>();
    const seenTypes = new Set<string>(), seenLevels = new Set<string>(), seenDiff = new Set<number>();
    (j.quiz ?? []).forEach((q: any) => {
      const w = `quiz ${q.id}`;
      if (!q.id || ids.has(q.id)) errs.push(`${w}: missing/duplicate id`); ids.add(q.id);
      if (!TYPES.includes(q.type)) errs.push(`${w}: bad type ${q.type}`);
      if (!LEVELS.includes(q.level)) errs.push(`${w}: bad level ${q.level}`);
      if (![1, 2, 3].includes(q.difficulty)) errs.push(`${w}: difficulty`);
      if (!q.prompt) errs.push(`${w}: prompt`);
      seenTypes.add(q.type); seenLevels.add(q.level); seenDiff.add(q.difficulty);
      if (q.type === "mc-single" || q.type === "mc-multi") {
        if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`${w}: needs 4 options`);
        if (!Array.isArray(q.answer) || !q.answer.length || q.answer.some((a: number) => a < 0 || a >= (q.options?.length ?? 0))) errs.push(`${w}: bad answer indices`);
        if (q.type === "mc-single" && q.answer?.length !== 1) errs.push(`${w}: mc-single needs exactly 1 answer`);
        if (q.type === "mc-multi" && q.answer?.length < 2) errs.push(`${w}: mc-multi needs ≥2 answers`);
      }
      if (q.type === "truefalse" && typeof q.answer !== "boolean") errs.push(`${w}: answer boolean`);
      if (q.type === "cloze") { const n = (q.prompt.match(/\{\{\d+\}\}/g) ?? []).length; if (!n || q.blanks?.length !== n) errs.push(`${w}: blanks (${q.blanks?.length}) ≠ placeholders (${n})`); }
      if (q.type === "match" && (!Array.isArray(q.pairs) || q.pairs.length < 3 || q.pairs.some((p: any) => !Array.isArray(p) || p.length !== 2))) errs.push(`${w}: pairs`);
      if (q.type === "order" && (!Array.isArray(q.items) || q.items.length < 3)) errs.push(`${w}: items`);
      if ((q.type === "free" || q.type === "case") && (!q.modelAnswer || !q.rubric?.length)) errs.push(`${w}: modelAnswer/rubric`);
      if (!q.explanation && !["free", "case"].includes(q.type)) warn.push(`${w}: no explanation`);
      if (!q.hints?.length) warn.push(`${w}: no hints`);
      checkSrc(q.src, w);
    });
    const drill = j.kind === "drill";
    if ((j.quiz ?? []).length < (drill ? 25 : 12)) errs.push(`only ${(j.quiz ?? []).length} quiz items (≥${drill ? 25 : 12})`);
    if (!drill) for (const t of TYPES) if (!seenTypes.has(t)) errs.push(`quiz type missing: ${t}`);
    if (!drill) for (const l of LEVELS) if (!seenLevels.has(l)) errs.push(`level missing: ${l}`);
    for (const d of [1, 2, 3]) if (!seenDiff.has(d)) errs.push(`difficulty missing: ${d}`);
    if (drill) { /* drill packs: case optional */ }
    else if (!j.case) errs.push("no Gutachten case");
    else {
      const parts = (j.case.steps ?? []).map((s: any) => s.part).join(",");
      if (parts !== "obersatz,definition,subsumtion,ergebnis") errs.push(`case steps must be obersatz,definition,subsumtion,ergebnis (got ${parts})`);
      (j.case.steps ?? []).forEach((s: any, i: number) => { if (!s.prompt || !s.model || !s.rubric?.length) errs.push(`case step ${i} incomplete`); });
      checkSrc(j.case.src, "case");
    }
    if ((j.flashcards ?? []).length < (j.kind === "drill" ? 0 : 8)) errs.push("≥8 flashcards");
    (j.flashcards ?? []).forEach((c: any, i: number) => { if (!c.front || !c.back) errs.push(`card ${i} incomplete`); checkSrc(c.src, `card ${i}`); });
    // coverage: each sub-section of the pack's topics should be referenced by ≥1 section and ≥2 quiz items
    const subs = cur.filter((t) => topics.includes(t.parentId ?? "") && t.pdfStart != null);
    for (const s of subs) {
      const key = `${PREFIX[s.moduleId]}_${s.ke ?? 1}`;
      const hit = (src: any[]) => (src ?? []).some((x) => x.doc === key && x.page >= s.pdfStart! && x.page <= s.pdfEnd!);
      const sec = (j.sections ?? []).filter((x: any) => hit(x.src)).length;
      const qn = (j.quiz ?? []).filter((x: any) => hit(x.src)).length;
      if (!sec || qn < 2) warn.push(`coverage ${s.id} (S. ${s.pdfStart}–${s.pdfEnd}): ${sec} sections, ${qn} quiz items`);
    }
  }
  if (errs.length) { failed++; console.log(`✗ ${f}\n  - ${errs.join("\n  - ")}`); }
  else console.log(`✓ ${f}${warn.length ? `  (${warn.length} Hinweise)` : ""}`);
  if (warn.length) console.log(`  · ${warn.slice(0, 12).join("\n  · ")}`);
}
process.exit(failed ? 1 : 0);
