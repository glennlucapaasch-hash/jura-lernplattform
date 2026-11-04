import { NextResponse } from "next/server";
import { AiUnavailableError, AiBudgetError } from "../ai/client";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route handler: maps known errors to friendly German messages. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response> | Response) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AiUnavailableError) return fail(e.message, 503);
      if (e instanceof AiBudgetError) return fail(e.message, 402);
      const err = e as { status?: number; message?: string };
      if (err?.status === 401) return fail("Der Claude-API-Schlüssel ist ungültig. Bitte in .env.local prüfen.", 502);
      if (err?.status === 429) return fail("Die Claude-API ist gerade ausgelastet (Rate-Limit). Bitte in einer Minute erneut versuchen.", 502);
      if (err?.status && err.status >= 500) return fail("Die Claude-API ist vorübergehend nicht erreichbar. Bitte später erneut versuchen.", 502);
      console.error(e);
      return fail(err?.message || "Unbekannter Fehler", 500);
    }
  };
}
