import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function secretString(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  // In production a weak/missing secret would let anyone forge admin tokens — refuse to run.
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is not set (or too short). Set a 32+ char random secret in the environment.");
  }
  // Dev only — keeps local development working without setup.
  return "dev-only-insecure-secret-do-not-use-in-prod";
}
const secret = () => new TextEncoder().encode(secretString());
export const ADMIN_COOKIE = "sh_admin";

export async function signAdminToken(payload: { sub: string; username: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as { sub: string; username: string; iat: number; exp: number };
  } catch {
    return null;
  }
}

export async function getCurrentAdmin() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return await verifyAdminToken(token);
}
