import { handle, ok } from "@/lib/http";
import { getPages } from "@/lib/repo/documents";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const u = new URL(req.url);
  const from = Number(u.searchParams.get("from") ?? 1);
  const to = Math.min(Number(u.searchParams.get("to") ?? from), from + 30);
  return ok({ pages: getPages(id, from, to) });
});
