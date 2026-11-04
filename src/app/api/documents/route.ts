import { handle, ok, fail } from "@/lib/http";
import { ingestDocument, listDocuments } from "@/lib/repo/documents";

export const runtime = "nodejs";
export const maxDuration = 300;

export const GET = handle(async () => ok({ documents: listDocuments() }));

export const POST = handle(async (req: Request) => {
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) return fail("Keine Datei übermittelt.");
  const moduleId = (form.get("moduleId") as string) || undefined;
  const ke = form.get("ke") ? Number(form.get("ke")) : undefined;
  const results = [];
  for (const f of files) {
    if (f.size > 60 * 1024 * 1024) {
      results.push({ filename: f.name, error: "Datei größer als 60 MB." });
      continue;
    }
    try {
      const r = await ingestDocument(f.name, new Uint8Array(await f.arrayBuffer()), { moduleId, ke });
      results.push({ filename: f.name, ...r });
    } catch (e) {
      results.push({ filename: f.name, error: (e as Error).message });
    }
  }
  return ok({ results });
});
