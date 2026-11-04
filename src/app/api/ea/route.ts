import { handle, ok, fail } from "@/lib/http";
import { getSetting, setSetting } from "@/lib/db";

/** Abhak-Status der Arbeitsschritte je Einsendeaufgabe (in der Datenbank gespeichert). */
export const GET = handle(async () => ok({ progress: getSetting<Record<string, string[]>>("eaProgress", {}) }));
export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { id: string; steps: string[] };
  if (!b.id || !Array.isArray(b.steps)) return fail("Ungültig");
  const p = getSetting<Record<string, string[]>>("eaProgress", {});
  p[b.id] = b.steps.filter((s) => typeof s === "string").slice(0, 20);
  setSetting("eaProgress", p);
  return ok({ ok: true });
});
