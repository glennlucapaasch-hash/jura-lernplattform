import { Database } from "./sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "./migrations";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const BACKUP_DIR = path.join(DATA_DIR, "backups");

type DB = Database;
const g = globalThis as unknown as { __juraDb?: DB };

export function db(): DB {
  if (g.__juraDb) return g.__juraDb;
  mkdirSync(UPLOAD_DIR, { recursive: true });
  mkdirSync(BACKUP_DIR, { recursive: true });
  const file = process.env.DB_FILE || path.join(DATA_DIR, "app.db");
  const conn = new Database(file);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  migrate(conn);
  g.__juraDb = conn;
  return conn;
}

/** For tests: open a fresh in-memory database. */
export function openTestDb(): DB {
  const conn = new Database(":memory:");
  conn.pragma("foreign_keys = ON");
  migrate(conn);
  g.__juraDb = conn;
  return conn;
}

function migrate(conn: DB) {
  conn.exec("CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
  const done = new Set(conn.prepare("SELECT version FROM _migrations").all().map((r) => (r as { version: number }).version));
  for (const m of MIGRATIONS) {
    if (done.has(m.version)) continue;
    conn.transaction(() => {
      conn.exec(m.sql);
      conn.prepare("INSERT INTO _migrations (version, applied_at) VALUES (?, ?)").run(m.version, new Date().toISOString());
    })();
  }
}

export function now() {
  return new Date().toISOString();
}

export function uid(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getSetting<T = string>(key: string, fallback: T): T {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown) {
  db()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, JSON.stringify(value));
}
