import { handle, ok, fail } from "@/lib/http";
import { listCards, createCard, cardPreview } from "@/lib/repo/cards";

export const GET = handle(async (req: Request) => {
  const u = new URL(req.url);
  const due = u.searchParams.get("due") === "1";
  const ids = u.searchParams.get("ids");
  let cards = listCards({ moduleId: u.searchParams.get("module") ?? undefined, due });
  if (ids) {
    const want = new Set(ids.split(","));
    cards = listCards().filter((c) => want.has(c.id));
  }
  return ok({ cards: cards.map((c) => ({ ...c, src: JSON.parse(c.src), preview: cardPreview(c) })) });
});

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { front: string; back: string; moduleId?: string; topicId?: string };
  if (!b.front?.trim() || !b.back?.trim()) return fail("Vorder- und Rückseite ausfüllen.");
  return ok({ id: createCard(b) });
});
