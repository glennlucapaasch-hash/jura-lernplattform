/** Runs once when the server starts: daily automatic backup of the local database. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV === "test") return;
  try {
    const { autoBackup } = await import("./lib/db/backup");
    await autoBackup();
  } catch (e) {
    console.error("Automatische Sicherung fehlgeschlagen:", e);
  }
}
