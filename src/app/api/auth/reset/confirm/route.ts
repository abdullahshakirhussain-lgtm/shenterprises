import { readJson } from "@/lib/requestBody";
import { persistentRateLimit } from "@/lib/persistentRateLimit";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/userAuth";

const MAX_ATTEMPTS = 5;

// Password reset, step 2: check the texted code and set the new password.
export async function POST(req: NextRequest) {
  try {
    if (!(await persistentRateLimit("reset-confirm:" + clientIp(req), 20, 600)).ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    if (!rateLimit("reset-confirm:" + clientIp(req), 20, 600).ok) return NextResponse.json({ error: "Too many attempts. Please try later." }, { status: 429 });
    const { phone, code, password } = await readJson(req);
    const normPhone = normalizePhone(String(phone || ""));
    if (!normPhone || !code) return NextResponse.json({ error: "Phone number and code are required." }, { status: 400 });
    if (typeof password !== "string" || password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

    const record = await prisma.otpCode.findFirst({ where: { phone: normPhone, verified: false }, orderBy: { createdAt: "desc" } });
    if (!record || record.expiresAt < new Date()) return NextResponse.json({ error: "That code has expired. Please request a new one." }, { status: 400 });

    // Same brute-force guard as sign-up verification: 5 wrong guesses locks the code.
    const attempt = await prisma.otpCode.updateMany({
      where: { id: record.id, attempts: { lt: MAX_ATTEMPTS }, verified: false, expiresAt: { gt: new Date() } },
      data: { attempts: { increment: 1 } },
    });
    if (!attempt.count) return NextResponse.json({ error: "Too many incorrect attempts. Please request a new code." }, { status: 429 });
    if (record.code !== String(code).trim()) {
      const left = MAX_ATTEMPTS - (record.attempts ?? 0) - 1;
      return NextResponse.json({ error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect code. Please request a new one." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: normPhone }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "That code has expired. Please request a new one." }, { status: 400 });

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
      prisma.otpCode.deleteMany({ where: { phone: normPhone } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to complete this request. Please try again." }, { status: 500 });
  }
}
