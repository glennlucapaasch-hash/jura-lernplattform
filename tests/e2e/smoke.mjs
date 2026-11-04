/**
 * End-to-end smoke test against a running app (npm run dev / npm start).
 * Usage: BASE_URL=http://localhost:3000 APP_PASSWORD=... node tests/e2e/smoke.mjs
 * Walks through: login → dashboard → session (new material, quiz attempt) → progress saved → upload → search → flashcard → deadline.
 */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PW = process.env.APP_PASSWORD ?? "testtest123";
const step = (s) => console.log("•", s);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  step("Login");
  await page.goto(BASE + "/login");
  const needsSetup = await page.locator('input[type=password]').count() === 2;
  await page.locator('input[type=password]').first().fill(PW);
  if (needsSetup) await page.locator('input[type=password]').nth(1).fill(PW);
  await page.locator("button", { hasText: /Anmelden|Passwort speichern/ }).click();
  await page.waitForURL(BASE + "/");

  step("Protected API without cookie returns 401");
  const anon = await fetch(BASE + "/api/documents");
  assert.equal(anon.status, 401);

  step("Dashboard shows start button");
  await page.getByText(/Heutige Lerneinheit (starten|fortsetzen)|Noch einmal ansehen/).first().waitFor();

  step("Start session");
  await page.goto(BASE + "/lerneinheit");
  const los = page.getByRole("button", { name: /Los geht/ });
  if (await los.count()) await los.click();
  await page.getByText(/Schritt 1 von/).waitFor();

  step("Advance through blocks, answer first closed quiz item");
  let answered = false;
  for (let i = 0; i < 8; i++) {
    const check = page.getByRole("button", { name: "Prüfen" });
    if (!answered && (await check.count())) {
      const opt = page.locator("button:has(span.rounded-full), button:has(span.rounded-md)").first();
      const tf = page.getByRole("button", { name: "Richtig", exact: true });
      if (await tf.count()) await tf.click(); else if (await opt.count()) await opt.click();
      if (await check.isEnabled()) {
        await check.click();
        const reveal = page.getByRole("button", { name: /Lösung anzeigen/ });
        for (let k = 0; k < 4 && !(await page.getByText(/^Richtig – /).count()); k++) {
          if (await reveal.count()) { await reveal.click(); break; }
          const more = page.getByRole("button", { name: /Weiterer Hinweis/ });
          if (await more.count()) await more.click(); else if (await check.count() && await check.isEnabled()) await check.click(); else break;
        }
        answered = true;
      }
    }
    const next = page.getByRole("button", { name: /^(Weiter|Lerneinheit beenden)/ });
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(400);
  }
  await page.getByText("Lerneinheit abgeschlossen").waitFor();
  const yes = page.getByRole("button", { name: /Ja, Abschnitt erarbeitet|Speichern/ });
  if (await yes.count()) await yes.click();

  step("Progress persisted");
  const s = await (await page.request.get(BASE + "/api/session")).json();
  assert.equal(s.session.status, "done");
  assert.ok(s.session.minutes >= 1, "minutes logged");
  if (answered) {
    await page.goto(BASE + "/fortschritt");
    await page.getByText("Kompetenzstufen").waitFor();
  }

  step("Upload TXT document and find it via search");
  const up = await page.request.post(BASE + "/api/documents", { multipart: { file: { name: "eigene-notizen.txt", mimeType: "text/plain", buffer: Buffer.from("Testnotiz zum Kontrahierungszwang " + Date.now()) } } });
  const upd = await up.json();
  assert.ok(upd.results[0].document, JSON.stringify(upd));
  const sr = await (await page.request.get(BASE + "/api/search?q=Kontrahierungszwang")).json();
  assert.ok(sr.documents.length > 0);

  step("Create and review flashcard");
  const fc = await (await page.request.post(BASE + "/api/flashcards", { data: { front: "E2E Frage", back: "E2E Antwort", moduleId: "55101" } })).json();
  const rv = await (await page.request.post(BASE + `/api/flashcards/${fc.id}`, { data: { rating: 3 } })).json();
  assert.ok(new Date(rv.due) > new Date());
  await page.request.delete(BASE + `/api/flashcards/${fc.id}`);

  step("Deadline CRUD + calendar export");
  const dl = await (await page.request.post(BASE + "/api/deadlines", { data: { title: "E2E Frist", date: "2027-01-15", kind: "anmeldung" } })).json();
  const ics = await (await page.request.get(BASE + "/api/deadlines/ics")).text();
  assert.ok(ics.includes("E2E Frist") && ics.includes("TRIGGER:-P3D"));
  await page.request.delete(BASE + `/api/deadlines/${dl.id}`);

  step("Pages render without client errors");
  for (const p of ["/lernplan", "/termine", "/module/55101", "/bibliothek", "/quiz", "/gutachten", "/klausur", "/karteikarten", "/fortschritt", "/archiv", "/einstellungen", "/dozent"]) {
    const r = await page.goto(BASE + p);
    assert.equal(r.status(), 200, p);
  }
  assert.deepEqual(errors, []);
  console.log("\nAlle Prüfungen bestanden.");
} catch (e) {
  console.error("\nFEHLER:", e.message);
  await page.screenshot({ path: "e2e-failure.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await browser.close();
}
