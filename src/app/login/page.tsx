"use client";
import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";

export default function LoginPage() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/auth").then((r) => r.json()).then((d) => setNeedsSetup(d.needsSetup)); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (needsSetup && pw !== pw2) return setErr("Die Passwörter stimmen nicht überein.");
    setBusy(true);
    const r = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (!r.ok) return setErr((await r.json()).error ?? "Anmeldung fehlgeschlagen");
    const next = new URLSearchParams(location.search).get("next") || "/";
    location.href = next.startsWith("/") ? next : "/";
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-white"><Scale size={20} /></span>
            <div>
              <h1 className="font-semibold">Jura-Lernbegleiter</h1>
              <p className="text-sm text-ink-soft">{needsSetup ? "Erster Start: Passwort festlegen" : "Bitte anmelden"}</p>
            </div>
          </div>
          {needsSetup === null ? null : (
            <form onSubmit={submit} className="space-y-3">
              <input type="password" autoFocus required placeholder="Passwort" value={pw} onChange={(e) => setPw(e.target.value)}
                className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-brand-400" autoComplete={needsSetup ? "new-password" : "current-password"} />
              {needsSetup && (
                <>
                  <input type="password" required placeholder="Passwort wiederholen" value={pw2} onChange={(e) => setPw2(e.target.value)}
                    className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-brand-400" autoComplete="new-password" />
                  <p className="text-xs text-ink-faint">Mindestens 8 Zeichen. Das Passwort schützt deine Unterlagen und Lerndaten, wenn du die App z. B. vom iPhone im WLAN öffnest.</p>
                </>
              )}
              {err && <p className="text-sm text-bad">{err}</p>}
              <Button className="w-full" disabled={busy}>{needsSetup ? "Passwort speichern" : "Anmelden"}</Button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
