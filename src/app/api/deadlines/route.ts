import { handle, ok, fail } from "@/lib/http";
import { db, now, uid } from "@/lib/db";
import { listDeadlines } from "@/lib/repo/study";

export const GET = handle(async () => ok({ deadlines: listDeadlines() }));

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as Record<string, unknown>;
  if (!b.title || !b.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(b.date))) return fail("Titel und Datum (JJJJ-MM-TT) sind erforderlich.");
  const id = uid("dl_");
  db().prepare(`INSERT INTO deadlines (id, module_id, kind, title, date, end_date, time, status, source, note, required_for_admission, covers, prep_days, work_minutes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, b.moduleId ?? null, b.kind ?? "sonstiges", b.title, b.date, b.endDate || null, b.time || null, b.status === "confirmed" ? "confirmed" : "unconfirmed",
    b.source || "eigene Angabe", b.note || null, b.requiredForAdmission ?? "unknown",
    ["einsendeaufgabe", "hausarbeit", "klausur"].includes(String(b.kind)) && b.moduleId ? JSON.stringify(b.covers ?? { all: true }) : null,
    Number(b.prepDays ?? (b.kind === "klausur" ? 6 : b.kind === "einsendeaufgabe" ? 2 : 0)), b.workMinutes ?? null, now(),
  );
  return ok({ id });
});
