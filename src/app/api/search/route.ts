import { handle, ok } from "@/lib/http";
import { searchDocuments } from "@/lib/repo/documents";
import { searchArchive } from "@/lib/repo/archive";

export const GET = handle(async (req: Request) => {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return ok({ documents: [], archive: [] });
  return ok({ documents: searchDocuments(q, 40), archive: searchArchive(q) });
});
