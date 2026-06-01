import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "fallback-secret-change-me");
export const USER_COOKIE = "sh_user";

export async function signUserToken(payload: { sub: string; phone: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyUserToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as { sub: string; phone: string; iat: number; exp: number };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const token = cookies().get(USER_COOKIE)?.value;
  if (!token) return null;
  const decoded = await verifyUserToken(token);
  if (!decoded) return null;
  const user = await prisma.user.findUnique({ where: { id: parseInt(decoded.sub) } });
  return user;
}

// Sri Lanka phone normalization: accept +94, 94, 0 prefixes; store as "94XXXXXXXXX"
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("0094")) n = n.slice(2);
  if (n.startsWith("94")) n = n;
  else if (n.startsWith("0")) n = "94" + n.slice(1);
  else if (n.length === 9) n = "94" + n;
  if (n.length !== 11 || !n.startsWith("94")) return null;
  return n;
}
