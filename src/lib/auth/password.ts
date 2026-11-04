import bcrypt from "bcryptjs";
import { getSetting, setSetting } from "../db";

export function hasPassword() {
  return !!getSetting<string | null>("passwordHash", null);
}

export async function setPassword(pw: string) {
  if (pw.length < 8) throw new Error("Das Passwort muss mindestens 8 Zeichen lang sein.");
  setSetting("passwordHash", await bcrypt.hash(pw, 12));
}

export async function checkPassword(pw: string) {
  const hash = getSetting<string | null>("passwordHash", null);
  if (!hash) return false;
  return bcrypt.compare(pw, hash);
}

// simple in-memory brute-force protection
const fails: number[] = [];
export function tooManyAttempts() {
  const cutoff = Date.now() - 15 * 60 * 1000;
  while (fails.length && fails[0] < cutoff) fails.shift();
  return fails.length >= 10;
}
export function noteFailure() {
  fails.push(Date.now());
}
