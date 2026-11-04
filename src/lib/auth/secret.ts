import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

/** Session signing key: SESSION_SECRET env or a random key generated once in data/secret.key. */
export function sessionSecret(): Uint8Array {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return new TextEncoder().encode(process.env.SESSION_SECRET);
  const dir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
  const file = path.join(dir, "secret.key");
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, randomBytes(48).toString("hex"), { mode: 0o600 });
  }
  return new TextEncoder().encode(readFileSync(file, "utf8").trim());
}
