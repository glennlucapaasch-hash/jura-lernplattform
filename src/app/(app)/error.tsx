"use client";
import { useEffect } from "react";
import Link from "next/link";

/** Catches errors in a page so the app never shows a blank screen. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-6 text-center">
      <p className="text-lg font-semibold">Hoppla – hier ist etwas schiefgelaufen.</p>
      <p className="mt-2 text-sm text-ink-soft">Deine Lerndaten sind gespeichert. Lade die Seite neu oder geh zurück zum Dashboard.</p>
      <div className="mt-4 flex justify-center gap-2">
        <button onClick={reset} className="h-10 rounded-xl bg-brand-500 px-4 font-medium text-white">Neu laden</button>
        <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-brand-50 px-4 font-medium text-brand-700">Zum Dashboard</Link>
      </div>
      {error.message && <p className="mt-4 text-xs text-ink-faint">Technischer Hinweis: {error.message.slice(0, 200)}</p>}
    </div>
  );
}
