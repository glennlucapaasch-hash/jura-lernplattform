import { readFileSync, existsSync } from "node:fs";
import { getDocument } from "@/lib/repo/documents";

const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const doc = getDocument(id);
  if (!doc || !existsSync(doc.stored_path)) return new Response("Nicht gefunden", { status: 404 });
  return new Response(readFileSync(doc.stored_path), {
    headers: {
      "content-type": TYPES[doc.kind] ?? "application/octet-stream",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "cache-control": "private, max-age=3600",
    },
  });
}
