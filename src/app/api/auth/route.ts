import { NextResponse } from "next/server";
import { checkPassword, hasPassword, setPassword, tooManyAttempts, noteFailure } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";

export async function GET() {
  return NextResponse.json({ needsSetup: !hasPassword() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; password?: string };
  const pw = String(body.password ?? "");
  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  if (!hasPassword()) {
    try {
      await setPassword(pw);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  } else {
    if (tooManyAttempts()) return NextResponse.json({ error: "Zu viele Fehlversuche. Bitte 15 Minuten warten." }, { status: 429 });
    if (!(await checkPassword(pw))) {
      noteFailure();
      return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
}
