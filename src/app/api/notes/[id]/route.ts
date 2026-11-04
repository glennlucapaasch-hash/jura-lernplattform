import { handle, ok } from "@/lib/http";
import { db, now } from "@/lib/db";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = (await req.json()) as { text: string };
  db().prepare("UPDATE notes SET text = ?, updated_at = ? WHERE id = ?").run(b.text, now(), id);
  return ok({ ok: true });
});
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  db().prepare("DELETE FROM notes WHERE id = ?").run(id);
  return ok({ ok: true });
});
