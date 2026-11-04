import { handle, ok } from "@/lib/http";
import { reviewCard, updateCard, deleteCard } from "@/lib/repo/cards";
import type { SrsRating } from "@/lib/learning/srs";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = (await req.json()) as { rating: SrsRating };
  return ok(reviewCard(id, b.rating));
});
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  updateCard(id, await req.json());
  return ok({ ok: true });
});
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  deleteCard(id);
  return ok({ ok: true });
});
