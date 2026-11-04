import { redirect } from "next/navigation";
import Link from "next/link";
import { docByKey } from "@/lib/repo/documents";
import { Notice } from "@/components/ui";

/** Resolves a lesson source reference (e.g. BGB_2, page 8) to the uploaded document. */
export default async function SourceRedirect({ searchParams }: { searchParams: Promise<{ key?: string; page?: string }> }) {
  const { key, page } = await searchParams;
  const doc = key ? docByKey(key) : undefined;
  if (doc) redirect(`/bibliothek/${doc.id}?page=${page ?? 1}`);
  return (
    <Notice tone="warn" title="Originaldokument noch nicht in der Bibliothek">
      Die Quelle „{key}“ (S. {page}) gehört zu einem Skript, das noch nicht hochgeladen wurde. <Link href="/bibliothek" className="underline">Jetzt hochladen</Link> – danach führt dieser Link direkt zur Seite.
    </Notice>
  );
}
