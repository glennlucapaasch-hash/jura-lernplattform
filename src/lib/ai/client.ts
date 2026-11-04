/**
 * Claude API access (server-side only). The API key lives in .env.local (ANTHROPIC_API_KEY)
 * and never reaches the browser. Every call is metered in the ai_usage table.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { db, getSetting, now, uid } from "../db";

export const MODELS = {
  "claude-opus-5-5": { label: "Claude Opus 5.5 (höchste Genauigkeit)", input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { label: "Claude Sonnet 5.5 (schneller, günstiger)", input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
} as const;
export type ModelId = keyof typeof MODELS;

export type Feature = "tutor" | "grading" | "generation";

/** Per-feature model choice; defaults to the most accurate model until the user decides otherwise. */
export function modelFor(feature: Feature): ModelId {
  const m = getSetting<string>(`model.${feature}`, "claude-opus-5-5");
  return (m in MODELS ? m : "claude-opus-5-5") as ModelId;
}

export function aiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && getSetting("aiEnabled", true);
}

let _client: Anthropic | null = null;
export function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiUnavailableError();
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      // explicit base URL so that unrelated environment variables cannot redirect requests
      baseURL: process.env.JURA_ANTHROPIC_BASE_URL || "https://api.anthropic.com",
      maxRetries: 2,
    });
  }
  return _client;
}

export class AiUnavailableError extends Error {
  constructor() {
    super("Die KI-Funktionen sind nicht aktiv: Es ist kein Claude-API-Schlüssel hinterlegt (siehe Einstellungen).");
  }
}

export class AiBudgetError extends Error {
  constructor(limit: number) {
    super(`Das von dir festgelegte Monatslimit von ${limit.toFixed(2)} $ für KI-Anfragen ist erreicht. Du kannst es in den Einstellungen anpassen.`);
  }
}

export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function costUsd(model: string, u: UsageLike) {
  const p = MODELS[model as ModelId] ?? MODELS["claude-opus-5-5"];
  return (
    (u.input_tokens * p.input + u.output_tokens * p.output + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) /
    1_000_000
  );
}

export function logUsage(feature: string, model: string, u: UsageLike) {
  db()
    .prepare(
      `INSERT INTO ai_usage (id, feature, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(uid("ai_"), feature, model, u.input_tokens, u.output_tokens, u.cache_read_input_tokens ?? 0, u.cache_creation_input_tokens ?? 0, costUsd(model, u), now());
}

export function monthSpend(): number {
  const month = new Date().toISOString().slice(0, 7);
  const r = db().prepare("SELECT COALESCE(SUM(cost_usd), 0) s FROM ai_usage WHERE substr(created_at, 1, 7) = ?").get(month) as { s: number };
  return r.s;
}

export function checkBudget() {
  const limit = getSetting<number>("monthlyBudgetUsd", 30);
  if (limit > 0 && monthSpend() >= limit) throw new AiBudgetError(limit);
}

/** Structured JSON output validated against a zod schema. */
export async function generateStructured<S extends z.ZodType>(opts: {
  feature: Feature;
  system: string;
  user: string | Anthropic.Beta.BetaContentBlockParam[];
  schema: S;
  effort?: "low" | "medium" | "high" | "xhigh";
  maxTokens?: number;
}): Promise<z.infer<S>> {
  if (!aiAvailable()) throw new AiUnavailableError();
  checkBudget();
  const model = modelFor(opts.feature);
  // Streaming is required by the SDK for long outputs; the JSON is validated against the schema afterwards.
  const stream = client().beta.messages.stream({
    model,
    max_tokens: opts.maxTokens ?? 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: opts.effort ?? "high", format: betaZodOutputFormat(opts.schema) },
  } as Parameters<ReturnType<typeof client>["beta"]["messages"]["stream"]>[0]);
  const res = await stream.finalMessage();
  logUsage(opts.feature, res.model ?? model, res.usage);
  if (res.stop_reason === "refusal") throw new Error("Die KI hat diese Anfrage abgelehnt. Bitte formuliere sie anders.");
  if (res.stop_reason === "max_tokens") throw new Error("Die Antwort der KI war zu lang und wurde abgeschnitten. Bitte erneut versuchen.");
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Die Antwort der KI hatte nicht das erwartete Format.");
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) throw new Error("Die Antwort der KI hatte nicht das erwartete Format.");
  return parsed.data as z.infer<S>;
}
