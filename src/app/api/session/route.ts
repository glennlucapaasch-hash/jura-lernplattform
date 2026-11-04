import { handle, ok, fail } from "@/lib/http";
import { getOrCreateTodaySession, startSession, logBlock, finishSession, getSession } from "@/lib/repo/session";
import { db } from "@/lib/db";

export const GET = handle(async () => ok({ session: getOrCreateTodaySession() }));

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { id: string; action: "start" | "log" | "finish" | "restart"; block?: number; minutes?: number; unitStudied?: boolean };
  if (!getSession(b.id)) return fail("Lerneinheit nicht gefunden", 404);
  if (b.action === "start") startSession(b.id);
  if (b.action === "log") logBlock(b.id, b.block ?? 0, Math.max(0, Math.min(180, b.minutes ?? 0)));
  if (b.action === "finish") finishSession(b.id, !!b.unitStudied);
  if (b.action === "restart") db().prepare("UPDATE study_sessions SET status = 'planned', log = '[]' WHERE id = ?").run(b.id);
  return ok({ session: getSession(b.id) });
});
