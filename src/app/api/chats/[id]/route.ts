import { handle, ok } from "@/lib/http";
import { db } from "@/lib/db";
export const GET = handle(async (_r: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const messages = (db().prepare("SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at").all(id) as { sources: string }[]).map((m) => ({ ...m, sources: JSON.parse(m.sources || "[]") }));
  return ok({ chat: db().prepare("SELECT * FROM chats WHERE id = ?").get(id), messages });
});
export const DELETE = handle(async (_r: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  db().prepare("DELETE FROM chats WHERE id = ?").run(id);
  return ok({ ok: true });
});
