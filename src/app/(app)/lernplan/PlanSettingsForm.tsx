"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, cx } from "@/components/ui";

const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function PlanSettingsForm({ settings }: { settings: { minutesPerDay: number; restWeekdays: number[]; skipDates: string[]; focusMode: boolean } }) {
  const [s, setS] = useState(settings);
  const [skip, setSkip] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  async function save(next = s) {
    await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }
  return (
    <Card>
      <CardBody className="space-y-5">
        <p className="font-semibold">Planung anpassen</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-ink-soft">Lernzeit pro Tag</span>
            <select value={s.minutesPerDay} onChange={(e) => setS({ ...s, minutesPerDay: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3">
              {[30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m} Minuten</option>)}
            </select>
          </label>
          <div className="text-sm">
            <span className="text-ink-soft">Freie Wochentage</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button key={d} type="button" onClick={() => setS({ ...s, restWeekdays: s.restWeekdays.includes(d) ? s.restWeekdays.filter((x) => x !== d) : [...s.restWeekdays, d] })}
                  className={cx("h-10 w-11 rounded-xl border text-sm", s.restWeekdays.includes(d) ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line")}>{WD[d]}</button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-3 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={s.focusMode} onChange={(e) => setS({ ...s, focusMode: e.target.checked })} />
            <span><span className="font-medium">Kernstoff-Modus</span><br /><span className="text-ink-soft">Weniger prüfungsrelevante Abschnitte bekommen 40–80 % der Zeit. Empfohlen, wenn die Zeit nicht für alles reicht.</span></span>
          </label>
          <div className="text-sm sm:col-span-2">
            <span className="text-ink-soft">Einzelne freie Tage (Urlaub, Dienstreise …)</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input type="date" value={skip} onChange={(e) => setSkip(e.target.value)} className="h-10 rounded-xl border border-line px-3" />
              <Button type="button" variant="secondary" size="sm" disabled={!skip} onClick={() => { if (skip && !s.skipDates.includes(skip)) setS({ ...s, skipDates: [...s.skipDates, skip].sort() }); setSkip(""); }}>Hinzufügen</Button>
              {s.skipDates.map((d) => (
                <button key={d} type="button" onClick={() => setS({ ...s, skipDates: s.skipDates.filter((x) => x !== d) })} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700">{d.split("-").reverse().join(".")} ×</button>
              ))}
            </div>
          </div>
        </div>
        <Button onClick={() => save()}>{saved ? "Gespeichert – Plan neu berechnet" : "Speichern und neu planen"}</Button>
      </CardBody>
    </Card>
  );
}
