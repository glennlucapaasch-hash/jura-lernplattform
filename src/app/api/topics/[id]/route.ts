import { handle, ok, fail } from "@/lib/http";
import { getTopic, setTopicStatus } from "@/lib/repo/study";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!getTopic(id)) return fail("Thema nicht gefunden", 404);
  const b = (await req.json()) as { status: "new" | "learning" | "studied" };
  setTopicStatus(id, b.status);
  return ok({ ok: true });
});
