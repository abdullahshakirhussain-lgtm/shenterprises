import { readJson } from "@/lib/requestBody";
import { persistentRateLimit } from "@/lib/persistentRateLimit";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ADMIN_COOKIE, signAdminToken } from "@/lib/auth";
import { rateLimit, rateLimitReset, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    if (!(await persistentRateLimit("admin-login:" + clientIp(req), 12, 300)).ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    // Throttle: max 8 attempts per IP per 5 minutes
    const ip = clientIp(req);
    const rlKey = `admin-login:${ip}`;
    const rl = rateLimit(rlKey, 8, 300);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const { username, password } = await readJson(req);
    if (!username || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    const admin = await prisma.admin.findUnique({ where: { username: String(username) } });
    if (!admin) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const ok = await bcrypt.compare(String(password), admin.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    // Successful login — clear the throttle so the admin isn't penalised next time
    rateLimitReset(rlKey);
    const token = await signAdminToken({ sub: String(admin.id), username: admin.username });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: "Unable to complete this request. Please try again." }, { status: 500 });
  }
}
