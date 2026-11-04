import { handle, ok, fail } from "@/lib/http";
import { db } from "@/lib/db";

const FIELDS: Record<string, string> = { title: "title", date: "date", endDate: "end_date", time: "time", status: "status", source: "source", note: "note", requiredForAdmission: "required_for_admission", done: "done", prepDays: "prep_days", kind: "kind", moduleId: "module_id" };

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = (await req.json()) as Record<string, unknown>;
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const [k, col] of Object.entries(FIELDS)) if (k in b) { sets.push(`${col} = ?`); args.push(typeof b[k] === "boolean" ? (b[k] ? 1 : 0) : b[k] === "" ? null : b[k]); }
  if (!sets.length) return fail("Keine Änderungen");
  db().prepare(`UPDATE deadlines SET ${sets.join(", ")} WHERE id = ?`).run(...args, id);
  return ok({ ok: true });
});
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  db().prepare("DELETE FROM deadlines WHERE id = ?").run(id);
  return ok({ ok: true });
});
