/**
 * Idempotent seeding from /content (modules, topic structure, lesson packs, deadlines).
 * Runs on first access; re-running only adds what is missing and never overwrites user data.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { db, now, uid } from "../db";
import { KNOWN_MODULES } from "../docs/curriculum";
import type { LessonPack } from "../learning/types";

const CONTENT = path.join(process.cwd(), "content");
let seeded = false;

export function ensureSeeded() {
  if (seeded) return;
  const d = db();
  d.transaction(() => {
    KNOWN_MODULES.forEach((m, i) => {
      d.prepare(
        `INSERT OR IGNORE INTO modules (id, title, short, description, color, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(m.id, m.title, m.short, m.description, m.color, i, now());
    });

    const curDir = path.join(CONTENT, "curriculum");
    if (existsSync(curDir)) {
      for (const f of readdirSync(curDir).filter((x) => x.endsWith(".json"))) {
        const c = JSON.parse(readFileSync(path.join(curDir, f), "utf8"));
        const ins = d.prepare(`INSERT OR IGNORE INTO topics
          (id, module_id, parent_id, ke, level, marker, title, pdf_start, pdf_end, printed_start, words, est_minutes, difficulty, exam_weight, sort, kind, placeholder)
          VALUES (@id, @moduleId, @parentId, @ke, @level, @marker, @title, @pdfStart, @pdfEnd, @printedStart, @words, @estMinutes, @difficulty, @examWeight, @sort, @kind, @placeholder)`);
        for (const t of c.topics) ins.run({ ...t, placeholder: t.placeholder ? 1 : 0 });
      }
    }

    const lessonDir = path.join(CONTENT, "lessons");
    if (existsSync(lessonDir)) {
      for (const f of readdirSync(lessonDir).filter((x) => x.endsWith(".json"))) {
        let pack: LessonPack;
        try {
          pack = JSON.parse(readFileSync(path.join(lessonDir, f), "utf8")) as LessonPack;
        } catch {
          console.error(`Lerneinheit ${f} konnte nicht gelesen werden und wird übersprungen.`);
          continue;
        }
        const exists = d.prepare("SELECT json, origin FROM lessons WHERE id = ?").get(pack.id) as { json: string; origin: string } | undefined;
        if (exists) {
          // content updates shipped with the app replace the stored copy (only for prepared lessons)
          if (exists.origin === "seed" && exists.json !== JSON.stringify(pack)) {
            d.prepare("UPDATE lessons SET json = ?, title = ?, topic_ids = ? WHERE id = ?").run(JSON.stringify(pack), pack.title, JSON.stringify(pack.topicIds), pack.id);
            const have = new Set((d.prepare("SELECT front FROM flashcards WHERE lesson_id = ?").all(pack.id) as { front: string }[]).map((r) => r.front));
            const introduced = (d.prepare("SELECT COUNT(*) n FROM flashcards WHERE lesson_id = ? AND due IS NOT NULL").get(pack.id) as { n: number }).n > 0;
            const ins = d.prepare(`INSERT INTO flashcards (id, module_id, topic_id, lesson_id, front, back, src, origin, due, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'seed', ?, ?, ?)`);
            for (const c of pack.flashcards) if (!have.has(c.front)) ins.run(uid("fc_"), pack.moduleId, pack.topicIds[0], pack.id, c.front, c.back, JSON.stringify(c.src ?? []), introduced ? now() : null, now(), now());
          }
          continue;
        }
        d.prepare(
          `INSERT INTO lessons (id, module_id, topic_ids, title, json, origin, created_at) VALUES (?, ?, ?, ?, ?, 'seed', ?)`,
        ).run(pack.id, pack.moduleId, JSON.stringify(pack.topicIds), pack.title, JSON.stringify(pack), now());
        const insCard = d.prepare(
          `INSERT INTO flashcards (id, module_id, topic_id, lesson_id, front, back, src, origin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'seed', ?, ?)`,
        );
        for (const c of pack.flashcards) insCard.run(uid("fc_"), pack.moduleId, pack.topicIds[0], pack.id, c.front, c.back, JSON.stringify(c.src ?? []), now(), now());
      }
    }

    const dlFile = path.join(CONTENT, "deadlines.json");
    if (existsSync(dlFile)) {
      const dl = JSON.parse(readFileSync(dlFile, "utf8"));
      const ins = d.prepare(`INSERT OR IGNORE INTO deadlines
        (id, module_id, kind, title, date, end_date, status, source, note, required_for_admission, covers, prep_days, work_minutes, created_at)
        VALUES (@id, @moduleId, @kind, @title, @date, @endDate, @status, @source, @note, @requiredForAdmission, @covers, @prepDays, @workMinutes, @createdAt)`);
      for (const m of [...dl.milestones, ...dl.reminders]) {
        ins.run({
          endDate: null,
          note: null,
          requiredForAdmission: "unknown",
          prepDays: 0,
          workMinutes: null,
          ...m,
          covers: m.covers ? JSON.stringify(m.covers) : null,
          createdAt: now(),
        });
      }
    }
  })();
  seeded = true;
}
