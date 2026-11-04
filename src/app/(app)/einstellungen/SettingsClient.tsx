"use client";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, Badge, Notice } from "@/components/ui";

interface S { settings: Record<string, unknown>; ai: { keyPresent: boolean; available: boolean; monthSpend: number; usage: { feature: string; model: string; n: number; cost: number }[] } }
const MODELS = [["claude-opus-5-5", "Claude Opus 5.5 – höchste Genauigkeit (4 $ / 20 $ pro Mio. Tokens)"], ["claude-sonnet-5-5", "Claude Sonnet 5.5 – schneller, halb so teuer (2 $ / 10 $)"]];
const FEAT: Record<string, string> = { tutor: "KI-Dozent (Dialog)", grading: "Bewertung von Antworten & Klausuren", generation: "Erstellen von Lerneinheiten & Fällen" };

export function SettingsClient({ dataDir }: { dataDir: string }) {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState("");
  const [pw, setPw] = useState({ old: "", n1: "", n2: "" });
  const [backups, setBackups] = useState<{ file: string; size: number }[]>([]);
  const load = () => { fetch("/api/settings").then((r) => r.json()).then(setS); fetch("/api/export?list=1").then((r) => r.json()).then((d) => setBackups(d.backups ?? [])); };
  useEffect(load, []);
  async function save(patch: Record<string, unknown>) {
    const r = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setMsg(r.ok ? "Gespeichert." : (await r.json()).error); load(); setTimeout(() => setMsg(""), 2000);
  }
  if (!s) return <p className="text-sm text-ink-faint">Lädt …</p>;
  const v = s.settings;
  return (
    <div className="space-y-6">
      {msg && <Notice tone="ok">{msg}</Notice>}
      <Card><CardBody className="space-y-4">
        <div className="flex items-center gap-2"><p className="font-semibold">KI (Claude-API)</p>{s.ai.available ? <Badge tone="ok">aktiv</Badge> : s.ai.keyPresent ? <Badge tone="warn">ausgeschaltet</Badge> : <Badge tone="warn">kein Schlüssel</Badge>}</div>
        {!s.ai.keyPresent && (
          <div className="space-y-2 text-sm">
            <p>So aktivierst du die KI-Funktionen (einmalig, ca. 5 Minuten):</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Auf <a className="text-brand-600 underline" href="https://console.anthropic.com" target="_blank">console.anthropic.com</a> ein Konto anlegen, unter „Billing“ Guthaben aufladen (z. B. 10 $) und unter „Limits“ ein Monatslimit setzen.</li>
              <li>Unter „API Keys“ einen Schlüssel erzeugen und kopieren.</li>
              <li>Im Projektordner die Datei <code>.env.local</code> öffnen (siehe README) und eintragen: <code>ANTHROPIC_API_KEY=sk-ant-…</code></li>
              <li>Die App neu starten (im Terminal <kbd>Strg+C</kbd>, dann <code>npm run start</code>).</li>
            </ol>
            <p className="text-ink-soft">Der Schlüssel bleibt auf deinem Mac und wird nie an den Browser übertragen.</p>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v.aiEnabled} onChange={(e) => save({ aiEnabled: e.target.checked })} /> KI-Funktionen verwenden</label>
        {Object.keys(FEAT).map((f) => (
          <label key={f} className="block text-sm"><span className="text-ink-soft">Modell für {FEAT[f]}</span>
            <select value={String(v[`model.${f}`])} onChange={(e) => save({ [`model.${f}`]: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3">{MODELS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
        ))}
        <label className="block text-sm"><span className="text-ink-soft">Monatslimit in der App (USD, 0 = kein Limit)</span>
          <input type="number" min={0} step={5} defaultValue={Number(v.monthlyBudgetUsd)} onBlur={(e) => save({ monthlyBudgetUsd: Number(e.target.value) })} className="mt-1 h-10 w-40 rounded-xl border border-line px-3" /></label>
        <div className="rounded-xl bg-canvas p-3 text-sm">
          <p className="font-medium">Verbrauch diesen Monat: {s.ai.monthSpend.toFixed(2)} $</p>
          {s.ai.usage.map((u, i) => <p key={i} className="text-ink-soft">{FEAT[u.feature] ?? u.feature} · {u.model}: {u.n} Anfragen, {u.cost.toFixed(2)} $</p>)}
          <p className="mt-1 text-xs text-ink-faint">Berechnet aus den von der API gemeldeten Tokens; maßgeblich ist die Abrechnung in der Anthropic-Konsole.</p>
        </div>
      </CardBody></Card>

      <Card><CardBody className="space-y-2 text-sm">
        <p className="font-semibold">Sprache</p>
        <p>Vorlesen und Spracheingabe nutzen die kostenlosen, eingebauten Stimmen von macOS/iOS (Safari). Bessere Stimmen: Mac → Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte → Systemstimme → „Stimmen verwalten“ → Deutsch, z. B. „Anna (Premium)“ laden; iPhone: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen.</p>
        <p className="text-ink-soft">Kostenpflichtige Cloud-Stimmen (z. B. OpenAI, ElevenLabs, Google) sind bewusst nicht aktiviert und würden erst nach deiner Zustimmung eingebaut.</p>
      </CardBody></Card>

      <Card><CardBody className="space-y-3 text-sm">
        <p className="font-semibold">Datensicherung & Export</p>
        <p className="text-ink-soft">Alle Daten liegen lokal in <code>{dataDir}</code>. Die App legt bei jedem Start automatisch eine Sicherung an (die 20 neuesten bleiben erhalten).</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={async () => { const r = await fetch("/api/export", { method: "POST" }); setMsg(r.ok ? "Sicherung erstellt." : "Fehler bei der Sicherung"); load(); }}>Jetzt sichern</Button>
          <a href="/api/export" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 font-medium hover:bg-brand-50">Lerndaten exportieren (JSON)</a>
          <a href="/api/deadlines/ics" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 font-medium hover:bg-brand-50">Termine als Kalender (.ics)</a>
        </div>
        {backups.length > 0 && <p className="text-xs text-ink-faint">Letzte Sicherung: {backups[0].file} ({Math.round(backups[0].size / 1024)} KB) · insgesamt {backups.length}</p>}
      </CardBody></Card>

      <Card><CardBody className="space-y-2 text-sm">
        <p className="font-semibold">Passwort ändern</p>
        <input type="password" placeholder="bisheriges Passwort" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} className="h-10 w-full max-w-sm rounded-xl border border-line px-3" />
        <input type="password" placeholder="neues Passwort (mind. 8 Zeichen)" value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} className="h-10 w-full max-w-sm rounded-xl border border-line px-3" />
        <input type="password" placeholder="neues Passwort wiederholen" value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} className="h-10 w-full max-w-sm rounded-xl border border-line px-3" />
        <Button variant="secondary" disabled={!pw.n1 || pw.n1 !== pw.n2} onClick={async () => { await save({ oldPassword: pw.old, newPassword: pw.n1 }); setPw({ old: "", n1: "", n2: "" }); }}>Ändern</Button>
        <div className="pt-2"><Button variant="ghost" onClick={async () => { await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); location.assign(new URL("/login", location.href).toString()); }}>Abmelden</Button></div>
      </CardBody></Card>
    </div>
  );
}
