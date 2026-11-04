"use client";
import { useState } from "react";
import Link from "next/link";

export function StepList({ id, initial, steps }: { id: string; initial: string[]; steps: { id: string; label: string; date: string | null; lesson?: string; lessonTitle?: string }[] }) {
  const [done, setDone] = useState<Set<string>>(new Set(initial));
  async function toggle(s: string) {
    const n = new Set(done);
    if (n.has(s)) n.delete(s); else n.add(s);
    setDone(n);
    await fetch("/api/ea", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, steps: [...n] }) });
  }
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={done.has(s.id)} onChange={() => toggle(s.id)} aria-label={s.label} />
          <div className={done.has(s.id) ? "text-ink-faint line-through" : ""}>
            <p className="text-[15px]">{i + 1}. {s.label}</p>
            <p className="text-xs text-ink-faint">{s.date ? `spätestens ${s.date.split("-").reverse().join(".")}` : ""}{s.lesson ? <> · <Link className="text-brand-600" href={`/lektion/${s.lesson}`}>{s.lessonTitle}</Link></> : null}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
