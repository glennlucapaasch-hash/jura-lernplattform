import { handle, ok, fail } from "@/lib/http";
import { deleteDocument, getDocument, setDocumentModule } from "@/lib/repo/documents";

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!getDocument(id)) return fail("Dokument nicht gefunden", 404);
  deleteDocument(id);
  return ok({ ok: true });
});

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = (await req.json()) as { moduleId?: string | null; ke?: number | null };
  setDocumentModule(id, b.moduleId ?? null, b.ke ?? null);
  return ok({ document: getDocument(id) });
});
