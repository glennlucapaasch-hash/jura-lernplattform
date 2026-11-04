"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui";

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => Promise<void> };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; canvas: HTMLCanvasElement; viewport: unknown }) => { promise: Promise<void>; cancel: () => void };
};

const cache = new Map<string, Promise<PdfDoc>>();

async function loadPdf(docId: string): Promise<PdfDoc> {
  if (!cache.has(docId)) {
    cache.set(
      docId,
      (async () => {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        return (await pdfjs.getDocument({ url: `/api/documents/${docId}/file` }).promise) as unknown as PdfDoc;
      })(),
    );
  }
  return cache.get(docId)!;
}

function PageCanvas({ doc, page, scale }: { doc: PdfDoc; page: number; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let task: { cancel: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const p = await doc.getPage(page);
      if (cancelled || !ref.current || !box.current) return;
      const base = p.getViewport({ scale: 1 });
      const fit = (box.current.clientWidth || 800) / base.width;
      const vp = p.getViewport({ scale: fit * scale * (window.devicePixelRatio || 1) });
      const c = ref.current;
      c.width = vp.width;
      c.height = vp.height;
      c.style.width = `${vp.width / (window.devicePixelRatio || 1)}px`;
      const t = p.render({ canvasContext: c.getContext("2d")!, canvas: c, viewport: vp });
      task = t;
      await t.promise.catch(() => {});
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [doc, page, scale]);
  return (
    <div ref={box} className="w-full overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
      <canvas ref={ref} className="mx-auto block" />
    </div>
  );
}

/** Full viewer with page navigation. */
export function PdfViewer({ docId, initialPage = 1, printedOffset = 0 }: { docId: string; initialPage?: number; printedOffset?: number }) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [page, setPage] = useState(initialPage);
  const [scale, setScale] = useState(1);
  const [err, setErr] = useState("");
  const [jump, setJump] = useState("");
  useEffect(() => { loadPdf(docId).then(setDoc).catch((e) => setErr(String(e?.message ?? e))); }, [docId]);
  useEffect(() => setPage(initialPage), [initialPage]);
  if (err) return <p className="text-sm text-bad">PDF konnte nicht geladen werden: {err}</p>;
  if (!doc) return <p className="text-sm text-ink-faint">PDF wird geladen …</p>;
  const go = (p: number) => setPage(Math.max(1, Math.min(doc.numPages, p)));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => go(page - 1)} aria-label="Vorherige Seite"><ChevronLeft size={16} /></Button>
        <span className="text-sm tabular-nums">Seite {page - printedOffset}{printedOffset ? ` (PDF ${page})` : ""} / {doc.numPages - printedOffset}</span>
        <Button variant="secondary" size="sm" onClick={() => go(page + 1)} aria-label="Nächste Seite"><ChevronRight size={16} /></Button>
        <form onSubmit={(e) => { e.preventDefault(); const n = parseInt(jump, 10); if (n) go(n + printedOffset); setJump(""); }} className="flex items-center gap-1">
          <input value={jump} onChange={(e) => setJump(e.target.value)} placeholder="Seite" inputMode="numeric" className="h-8 w-16 rounded-lg border border-line px-2 text-sm" />
        </form>
        <span className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.max(0.6, s - 0.15))} aria-label="Verkleinern"><ZoomOut size={16} /></Button>
          <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.min(2.5, s + 0.15))} aria-label="Vergrößern"><ZoomIn size={16} /></Button>
          <a href={`/api/documents/${docId}/file#page=${page}`} target="_blank" className="inline-flex h-8 items-center gap-1 rounded-xl px-3 text-sm text-ink-soft hover:bg-brand-50"><ExternalLink size={14} /> Original</a>
        </span>
      </div>
      <PageCanvas doc={doc} page={page} scale={scale} />
    </div>
  );
}

/** Renders a page range one below the other (guided reading). */
export function PdfPages({ docId, from, to }: { docId: string; from: number; to: number }) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [shown, setShown] = useState(Math.min(to, from + 2));
  useEffect(() => { loadPdf(docId).then(setDoc); }, [docId]);
  if (!doc) return <p className="text-sm text-ink-faint">PDF wird geladen …</p>;
  const pages = Array.from({ length: shown - from + 1 }, (_, i) => from + i);
  return (
    <div className="space-y-4">
      {pages.map((p) => <PageCanvas key={p} doc={doc} page={p} scale={1} />)}
      {shown < to && <Button variant="secondary" onClick={() => setShown(Math.min(to, shown + 3))}>Weitere Seiten ({shown + 1}–{Math.min(to, shown + 3)})</Button>}
    </div>
  );
}
