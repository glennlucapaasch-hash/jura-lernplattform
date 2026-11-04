"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Check } from "lucide-react";
import { Badge, Button, Card, CardBody, cx, formatDate } from "@/components/ui";
import type { DeadlineRow } from "@/lib/repo/study";

const KIND: Record<string, string> = { anmeldung: "Anmeldung", ruecktritt: "Rücktritt/Abmeldung", einsendeaufgabe: "Einsendeaufgabe", hausarbeit: "Hausarbeit", klausur: "Klausur", lektion: "Online-Lektion", ag: "Arbeitsgemeinschaft", belegung: "Belegung", sonstiges: "Aufgabe/Sonstiges" };
const ADM: Record<string, string> = { yes: "Zulassungsvoraussetzung", no: "keine Zulassungsvoraussetzung", unknown: "Zulassungsrelevanz ungeklärt" };

function daysUntil(t: string, d: string) { return Math.round((Date.parse(d + "T12:00:00") - Date.parse(t + "T12:00:00")) / 86400000); }

export function DeadlineManager({ initial, modules, today }: { initial: DeadlineRow[]; modules: { id: string; short: string }[]; today: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const mod = new Map(modules.map((m) => [m.id, m.short]));
  const list = initial.filter((d) => showDone || (!d.done && (d.end_date ?? d.date) >= today));

  async function save(id?: string) {
    const body = { ...form, status: form.status || "unconfirmed" };
    await fetch(id ? `/api/deadlines/${id}` : "/api/deadlines", { method: id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(id ? body : { ...body, moduleId: form.moduleId || null }) });
    setEditing(null); setAdding(false); setForm({});
    router.refresh();
  }
  async function patch(id: string, b: object) { await fetch(`/api/deadlines/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); router.refresh(); }
  async function del(id: string) { if (confirm("Termin wirklich löschen?")) { await fetch(`/api/deadlines/${id}`, { method: "DELETE" }); router.refresh(); } }

  const Field = ({ k, label, type = "text", options }: { k: string; label: string; type?: string; options?: [string, string][] }) => (
    <label className="block text-sm">
      <span className="text-ink-soft">{label}</span>
      {options ? (
        <select value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2">
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input type={type} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-line px-3" />
      )}
    </label>
  );
  const editor = (id?: string) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">{Field({ k: "title", label: "Bezeichnung" })}</div>
      {Field({ k: "kind", label: "Art", options: Object.entries(KIND) })}
      {Field({ k: "moduleId", label: "Modul", options: [["", "–"], ...modules.map((m) => [m.id, `${m.id} ${m.short}`] as [string, string])] })}
      {Field({ k: "date", label: "Datum (bzw. Beginn)", type: "date" })}
      {Field({ k: "endDate", label: "Ende (optional)", type: "date" })}
      {Field({ k: "time", label: "Uhrzeit (optional)", type: "time" })}
      {Field({ k: "status", label: "Status", options: [["unconfirmed", "unbestätigt"], ["confirmed", "bestätigt (offiziell geprüft)"]] })}
      {Field({ k: "requiredForAdmission", label: "Zulassungsvoraussetzung?", options: [["unknown", "ungeklärt"], ["yes", "ja"], ["no", "nein"]] })}
      {Field({ k: "source", label: "Quelle (Link oder \u201eMoodle\u201c, \u201ePr\u00fcfungsportal\u201c \u2026)" })}
      <div className="sm:col-span-2">{Field({ k: "note", label: "Notiz (z. B. Abgabeweg, Hinweise)" })}</div>
      <div className="flex gap-2 sm:col-span-2">
        <Button onClick={() => save(id)} disabled={!form.title || !form.date}><Check size={16} /> Speichern</Button>
        <Button variant="ghost" onClick={() => { setEditing(null); setAdding(false); }}>Abbrechen</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => { setAdding(true); setForm({ kind: "sonstiges", status: "unconfirmed", requiredForAdmission: "unknown" }); }}><Plus size={16} /> Termin hinzufügen</Button>
        <label className="ml-auto flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Erledigte/vergangene zeigen</label>
      </div>
      {adding && <Card><CardBody>{editor()}</CardBody></Card>}
      {list.map((d) => {
        const n = daysUntil(today, d.date);
        return (
          <Card key={d.id} className={cx(d.done ? "opacity-60" : "")}>
            <CardBody>
              {editing === d.id ? editor(d.id) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className={cx("grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-center", n <= 3 ? "bg-bad-soft text-bad" : n <= 14 ? "bg-warn-soft text-warn" : "bg-brand-50 text-brand-700")}>
                    <div><p className="text-xl font-semibold leading-none">{n < 0 ? "–" : n}</p><p className="text-[11px]">{n === 1 ? "Tag" : "Tage"}</p></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{d.title}</p>
                      {d.status === "confirmed" ? <Badge tone="ok">bestätigt</Badge> : <Badge tone="warn">unbestätigt</Badge>}
                    </div>
                    <p className="text-sm text-ink-soft">
                      {KIND[d.kind] ?? d.kind}{d.module_id && mod.get(d.module_id) ? ` · ${mod.get(d.module_id)}` : ""} · {formatDate(d.date)}{d.end_date ? ` – ${formatDate(d.end_date)}` : ""}{d.time ? `, ${d.time} Uhr` : ""}
                    </p>
                    {["einsendeaufgabe", "hausarbeit", "klausur"].includes(d.kind) && <p className="text-sm text-ink-soft">{ADM[d.required_for_admission]}</p>}
                    {d.note && <p className="mt-1 text-sm">{d.note}</p>}
                    {d.source && <p className="mt-1 break-all text-xs text-ink-faint">Quelle: {d.source.startsWith("http") ? <a href={d.source} target="_blank" className="underline">{d.source}</a> : d.source}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1 sm:flex-col">
                    <Button variant="ghost" size="sm" onClick={() => patch(d.id, { done: !d.done })}><Check size={15} /> {d.done ? "offen" : "erledigt"}</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(d.id); setForm({ title: d.title, kind: d.kind, moduleId: d.module_id ?? "", date: d.date, endDate: d.end_date ?? "", time: d.time ?? "", status: d.status, source: d.source ?? "", note: d.note ?? "", requiredForAdmission: d.required_for_admission }); }}><Pencil size={15} /> Bearbeiten</Button>
                    <Button variant="ghost" size="sm" onClick={() => del(d.id)}><Trash2 size={15} /></Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
