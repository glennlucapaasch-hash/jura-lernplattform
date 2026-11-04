import { fail } from "@/lib/http";
import { tutorReply, createChat, type TutorContext } from "@/lib/ai/tutor";
import { aiAvailable, AiUnavailableError, AiBudgetError } from "@/lib/ai/client";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Streams NDJSON lines: {"chatId"} first, then {"t": "..."} chunks, finally {"done": true, passages, check} or {"error"}. */
export async function POST(req: Request) {
  const b = (await req.json()) as { chatId?: string; message: string; ctx?: TutorContext };
  if (!b.message?.trim()) return fail("Leere Nachricht");
  if (!aiAvailable()) return fail(new AiUnavailableError().message, 503);
  const ctx = b.ctx ?? {};
  let chatId = b.chatId;
  if (!chatId || !db().prepare("SELECT 1 FROM chats WHERE id = ?").get(chatId)) chatId = createChat(b.message, ctx);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      send({ chatId });
      try {
        const r = await tutorReply({ chatId: chatId!, message: b.message, ctx, onText: (t) => send({ t }) });
        send({
          done: true,
          check: r.check,
          passages: r.passages.map((p) => ({ ref: p.ref, docId: p.docId, docTitle: p.docTitle, page: p.page, printedPage: p.printedPage, excerpt: p.text.slice(0, 280) })),
        });
      } catch (e) {
        const msg = e instanceof AiBudgetError || e instanceof AiUnavailableError ? e.message : (e as { status?: number }).status === 429 ? "Die Claude-API ist ausgelastet. Bitte gleich noch einmal versuchen." : `Fehler: ${(e as Error).message}`;
        send({ error: msg });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
