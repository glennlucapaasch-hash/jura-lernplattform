import { readdirSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { db, BACKUP_DIR, DATA_DIR } from "./index";

/** One backup per day (on server start); keeps the 20 newest. */
export async function autoBackup() {
  if (!existsSync(path.join(DATA_DIR, "app.db"))) return;
  const day = new Date().toISOString().slice(0, 10);
  const files = readdirSync(BACKUP_DIR).filter((f) => f.startsWith("backup-") && f.endsWith(".db")).sort().reverse();
  if (files.some((f) => f.startsWith(`backup-${day}`))) return;
  await db().backup(path.join(BACKUP_DIR, `backup-${day}T${new Date().toTimeString().slice(0, 8).replace(/:/g, "-")}.db`));
  for (const f of files.slice(19)) unlinkSync(path.join(BACKUP_DIR, f));
}
