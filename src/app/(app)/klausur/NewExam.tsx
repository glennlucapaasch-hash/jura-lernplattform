"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, cx } from "@/components/ui";

export function NewExam({ ai, modules, offline, initialModule }: { ai: boolean; modules: { id: string; title: string }[]; offline: { lessonId: string; moduleId: string; title: string }[]; initialModule?: string }) {
  const router = useRouter();
  const [moduleId, setModuleId] = useState(initialModule ?? modules[0]?.id ?? "");
  const [source, setSource] = useState<"offline" | "ai">(ai ? "ai" : "offline");
  const [lessonId, setLessonId] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [minutes, setMinutes] = useState(60);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const off = offline.filter((o) => o.moduleId === moduleId);
  async function go() {
    setBusy(true); setErr("");
    const r = await fetch("/api/exams", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source, moduleId, lessonId: lessonId || off[0]?.lessonId, difficulty, durationMin: minutes }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(d.error);
    router.push(`/klausur/${d.id}`);
  }
  return (
    <Card><CardBody className="space-y-4">
      <p className="font-semibold">Neue Übungsklausur</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm"><span className="text-ink-soft">Modul</span>
          <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3">{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
        <label className="text-sm"><span className="text-ink-soft">Bearbeitungszeit</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3">{[20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} Minuten</option>)}</select></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSource("ai")} disabled={!ai} className={cx("rounded-xl border px-3 py-2 text-left text-sm disabled:opacity-50", source === "ai" ? "border-brand-400 bg-brand-50" : "border-line")}><span className="font-medium">Neuer Fall vom KI-Dozenten</span><br /><span className="text-ink-soft">aus deinen bereits bearbeiteten Themen{ai ? "" : " (API-Schlüssel nötig)"}</span></button>
        <button onClick={() => setSource("offline")} className={cx("rounded-xl border px-3 py-2 text-left text-sm", source === "offline" ? "border-brand-400 bg-brand-50" : "border-line")}><span className="font-medium">Fall aus den Lerneinheiten</span><br /><span className="text-ink-soft">Fälle aus deinen Skripten</span></button>
      </div>
      {source === "ai" && (
        <div className="flex gap-1">{[1, 2, 3].map((d) => <button key={d} onClick={() => setDifficulty(d)} className={cx("rounded-full border px-3 py-1 text-sm", difficulty === d ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-soft")}>{["", "leicht", "mittel", "schwer"][d]}</button>)}</div>
      )}
      {source === "offline" && (
        <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm">
          {off.length === 0 && <option>Für dieses Modul gibt es noch keine Fälle</option>}
          {off.map((o) => <option key={o.lessonId} value={o.lessonId}>{o.title}</option>)}
        </select>
      )}
      {err && <p className="text-sm text-bad">{err}</p>}
      <Button onClick={go} disabled={busy || (source === "offline" && !off.length)}>{busy ? "Fall wird erstellt …" : "Klausur beginnen"}</Button>
    </CardBody></Card>
  );
}
