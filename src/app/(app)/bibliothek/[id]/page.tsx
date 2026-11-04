import { notFound } from "next/navigation";
import { PageHeader, Card, CardBody } from "@/components/ui";
import { getDocument } from "@/lib/repo/documents";
import { listModules } from "@/lib/repo/study";
import { PdfViewer } from "@/components/docs/PdfViewer";
import { DocActions } from "./DocActions";
import { db } from "@/lib/db";

export default async function DocPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params;
  const { page } = await searchParams;
  const doc = getDocument(id);
  if (!doc) notFound();
  const p = Number(page ?? 1) || 1;
  const textPage = doc.kind !== "pdf" ? (db().prepare("SELECT text FROM pages WHERE doc_id = ? AND page = ?").get(id, p) as { text: string } | undefined)?.text : undefined;
  return (
    <div className="space-y-4">
      <PageHeader title={doc.title} subtitle={`${doc.filename} · ${doc.page_count} Seiten`} />
      <DocActions doc={{ id: doc.id, module_id: doc.module_id, ke: doc.ke }} modules={listModules().map((m) => ({ id: m.id, title: m.title }))} />
      {doc.kind === "pdf" ? <PdfViewer docId={doc.id} initialPage={p} printedOffset={doc.page_offset} /> : (
        <Card><CardBody><p className="mb-2 text-sm text-ink-faint">Abschnitt {p} von {doc.page_count}</p><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{textPage}</p>
          <div className="mt-4 flex gap-3 text-sm">{p > 1 && <a className="text-brand-600" href={`?page=${p - 1}`}>← zurück</a>}{p < doc.page_count && <a className="text-brand-600" href={`?page=${p + 1}`}>weiter →</a>}<a className="ml-auto text-ink-soft" href={`/api/documents/${doc.id}/file`}>Original herunterladen</a></div>
        </CardBody></Card>
      )}
    </div>
  );
}
