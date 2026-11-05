import { handle, ok, fail } from "@/lib/http";
import { db, now } from "@/lib/db";

/** Lesestand: Abschnitt einer Lerneinheit als gelesen markieren (oder wieder entfernen). */
export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { lessonId: string; sectionId: string; read?: boolean };
  if (!b.lessonId || !b.sectionId) return fail("Ungültig");
  if (b.read === false) db().prepare("DELETE FROM lesson_reads WHERE lesson_id = ? AND section_id = ?").run(b.lessonId, b.sectionId);
  else db().prepare("INSERT INTO lesson_reads (lesson_id, section_id, read_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING").run(b.lessonId, b.sectionId, now());
  return ok({ ok: true });
});
