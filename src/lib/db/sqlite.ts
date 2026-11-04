/**
 * Thin wrapper around Node's built-in SQLite (node:sqlite, Node ≥ 22.13) with the small API surface
 * this app uses (prepare/exec/pragma/transaction/backup). No native module has to be compiled on the
 * user's computer, so installation works on every Mac without developer tools.
 */
import { DatabaseSync, backup as sqliteBackup, type StatementSync } from "node:sqlite";

type Param = string | number | bigint | null | Uint8Array;
type Params = Param[] | [Record<string, Param>];

function normalize(args: unknown[]): Params {
  return args.map((a) => {
    if (a === undefined) return null;
    if (typeof a === "boolean") return a ? 1 : 0;
    if (a && typeof a === "object" && !(a instanceof Uint8Array)) {
      const o: Record<string, Param> = {};
      for (const [k, v] of Object.entries(a)) o[k] = v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : (v as Param);
      return o;
    }
    return a as Param;
  }) as Params;
}

export class Statement {
  constructor(private st: StatementSync) {}
  run(...args: unknown[]) {
    const r = this.st.run(...(normalize(args) as Param[]));
    return { changes: Number(r.changes), lastInsertRowid: r.lastInsertRowid };
  }
  get(...args: unknown[]): unknown {
    const r = this.st.get(...(normalize(args) as Param[]));
    return r === undefined ? undefined : { ...r };
  }
  all(...args: unknown[]): unknown[] {
    return this.st.all(...(normalize(args) as Param[])).map((r) => ({ ...r }));
  }
}

export class Database {
  readonly raw: DatabaseSync;
  private depth = 0;
  constructor(file: string) {
    this.raw = new DatabaseSync(file);
  }
  prepare(sql: string) {
    return new Statement(this.raw.prepare(sql));
  }
  exec(sql: string) {
    this.raw.exec(sql);
  }
  pragma(p: string) {
    this.raw.exec(`PRAGMA ${p}`);
  }
  /** Same calling convention as better-sqlite3: db.transaction(fn)() */
  transaction<A extends unknown[], R>(fn: (...a: A) => R): (...a: A) => R {
    return (...a: A) => {
      const sp = `sp${this.depth++}`;
      this.raw.exec(this.depth === 1 ? "BEGIN" : `SAVEPOINT ${sp}`);
      try {
        const r = fn(...a);
        this.raw.exec(this.depth === 1 ? "COMMIT" : `RELEASE ${sp}`);
        return r;
      } catch (e) {
        this.raw.exec(this.depth === 1 ? "ROLLBACK" : `ROLLBACK TO ${sp}`);
        throw e;
      } finally {
        this.depth--;
      }
    };
  }
  async backup(file: string) {
    await sqliteBackup(this.raw, file);
  }
}
