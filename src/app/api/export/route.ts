import { handle, ok } from "@/lib/http";
import { db, BACKUP_DIR } from "@/lib/db";
import path from "node:path";
import { readdirSync, statSync } from "node:fs";

/**
 * GET ?format=json → download of all personal learning data (without the copyrighted documents).
 * POST → consistent SQLite backup copy in data/backups (includes extracted texts; stays on this computer).
 */
const TABLES = ["modules", "topics", "topic_progress", "lessons", "attempts", "mistakes", "flashcards", "card_reviews", "study_sessions", "deadlines", "chats", "chat_messages", "exams", "notes", "ai_usage"];

export const GET = handle(async (req: Request) => {
  const u = new URL(req.url);
  if (u.searchParams.get("list") === "1") {
    const files = readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".db")).map((f) => ({ file: f, size: statSync(path.join(BACKUP_DIR, f)).size })).sort((a, b) => b.file.localeCompare(a.file));
    return ok({ backups: files, dir: BACKUP_DIR });
  }
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = db().prepare(`SELECT * FROM ${t}`).all();
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), app: "jura-lernplattform", version: 1, data }, null, 1);
  return new Response(body, {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="jura-lerndaten-${new Date().toISOString().slice(0, 10)}.json"` },
  });
});

export const POST = handle(async () => {
  const file = path.join(BACKUP_DIR, `backup-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.db`);
  await db().backup(file);
  // keep the 20 newest backups
  const all = readdirSync(BACKUP_DIR).filter((f) => f.startsWith("backup-") && f.endsWith(".db")).sort().reverse();
  for (const f of all.slice(20)) (await import("node:fs")).unlinkSync(path.join(BACKUP_DIR, f));
  return ok({ file });
});
