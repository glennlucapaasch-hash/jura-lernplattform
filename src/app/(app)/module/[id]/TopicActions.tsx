"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export function TopicActions({ topicId, level, hasLesson, studied, ai }: { topicId: string; level: number; hasLesson: boolean; studied: boolean; ai: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function mark() {
    await fetch(`/api/topics/${topicId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: studied ? "learning" : "studied" }) });
    router.refresh();
  }
  async function gen() {
    setBusy(true); setErr("");
    const r = await fetch("/api/lessons/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topicId }) });
    setBusy(false);
    if (!r.ok) setErr((await r.json()).error); else router.refresh();
  }
  return (
    <>
      {level === 1 && !hasLesson && ai && (
        <button onClick={gen} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft hover:border-brand-200 disabled:opacity-50">
          <Sparkles size={12} /> {busy ? "wird erstellt …" : "Lerneinheit erstellen"}
        </button>
      )}
      {level === 2 || !hasLesson ? (
        <button onClick={mark} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft hover:border-brand-200">{studied ? "als offen markieren" : "als erarbeitet markieren"}</button>
      ) : null}
      {err && <span className="text-xs text-bad">{err}</span>}
    </>
  );
}
