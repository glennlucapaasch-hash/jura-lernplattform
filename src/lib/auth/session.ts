import { SignJWT, jwtVerify } from "jose";
import { sessionSecret } from "./secret";

export const SESSION_COOKIE = "jura_session";
export const SESSION_DAYS = 30;

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(sessionSecret());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
