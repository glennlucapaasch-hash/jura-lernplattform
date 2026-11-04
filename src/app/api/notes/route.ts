import { handle, ok, fail } from "@/lib/http";
import { db, now, uid } from "@/lib/db";
import { listNotes } from "@/lib/repo/archive";

export const GET = handle(async () => ok({ notes: listNotes() }));
export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { text?: string; topicId?: string; moduleId?: string; docId?: string; page?: number };
  if (!b.text?.trim()) return fail("Leere Notiz");
  const id = uid("no_");
  db().prepare("INSERT INTO notes (id, module_id, topic_id, doc_id, page, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, b.moduleId ?? null, b.topicId ?? null, b.docId ?? null, b.page ?? null, b.text.trim(), now(), now());
  return ok({ id });
});
