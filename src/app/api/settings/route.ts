import { handle, ok, fail } from "@/lib/http";
import { getSetting, setSetting } from "@/lib/db";
import { aiAvailable, monthSpend, MODELS } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { setPassword, checkPassword } from "@/lib/auth/password";

const ALLOWED: Record<string, (v: unknown) => boolean> = {
  minutesPerDay: (v) => typeof v === "number" && v >= 15 && v <= 300,
  restWeekdays: (v) => Array.isArray(v) && v.every((x) => Number.isInteger(x) && x >= 0 && x <= 6),
  skipDates: (v) => Array.isArray(v) && v.every((x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)),
  focusMode: (v) => typeof v === "boolean",
  aiEnabled: (v) => typeof v === "boolean",
  monthlyBudgetUsd: (v) => typeof v === "number" && v >= 0 && v <= 1000,
  "model.tutor": (v) => typeof v === "string" && v in MODELS,
  "model.grading": (v) => typeof v === "string" && v in MODELS,
  "model.generation": (v) => typeof v === "string" && v in MODELS,
  ttsRate: (v) => typeof v === "number" && v >= 0.5 && v <= 2,
  ttsVoice: (v) => typeof v === "string",
};

export const GET = handle(async () => {
  const usage = db().prepare("SELECT feature, model, COUNT(*) n, SUM(cost_usd) cost FROM ai_usage WHERE substr(created_at,1,7) = ? GROUP BY feature, model").all(new Date().toISOString().slice(0, 7));
  return ok({
    settings: Object.fromEntries(Object.keys(ALLOWED).map((k) => [k, getSetting(k, defaults[k])])),
    ai: { keyPresent: !!process.env.ANTHROPIC_API_KEY, available: aiAvailable(), monthSpend: monthSpend(), usage },
  });
});

const defaults: Record<string, unknown> = {
  minutesPerDay: 60, restWeekdays: [], skipDates: [], focusMode: false, aiEnabled: true, monthlyBudgetUsd: 30,
  "model.tutor": "claude-opus-5-5", "model.grading": "claude-opus-5-5", "model.generation": "claude-opus-5-5", ttsRate: 1, ttsVoice: "",
};

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as Record<string, unknown>;
  if (b.newPassword) {
    if (!(await checkPassword(String(b.oldPassword ?? "")))) return fail("Das bisherige Passwort ist falsch.", 401);
    await setPassword(String(b.newPassword));
    return ok({ ok: true });
  }
  for (const [k, v] of Object.entries(b)) {
    if (!ALLOWED[k]) return fail(`Unbekannte Einstellung: ${k}`);
    if (!ALLOWED[k](v)) return fail(`Ungültiger Wert für ${k}`);
    setSetting(k, v);
  }
  return ok({ ok: true });
});
