import { readJson } from "@/lib/requestBody";
import { persistentRateLimit } from "@/lib/persistentRateLimit";
import { NextRequest, NextResponse } from "next/server";
import { signVerification, VERIFICATION_COOKIE } from "@/lib/verification";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/userAuth";

export async function POST(req: NextRequest) {
  try {
    if (!(await persistentRateLimit("verify:" + clientIp(req), 20, 600)).ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    if (!rateLimit("verify:" + clientIp(req), 20, 600).ok) return NextResponse.json({ error: "Too many attempts. Please try later." }, { status: 429 });
    const { phone, code } = await readJson(req);
    if (!phone || !code) return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });

    const normPhone = normalizePhone(String(phone));
    if (!normPhone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    const record = await prisma.otpCode.findFirst({
      where: { phone: normPhone, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return NextResponse.json({ error: "No code found for this number. Please request a new one." }, { status: 400 });
    if (record.expiresAt < new Date()) return NextResponse.json({ error: "That code has expired. Please request a new one." }, { status: 400 });

    // Brute-force guard: lock this code after 5 wrong guesses
    const MAX_ATTEMPTS = 5;
    if ((record.attempts ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
    }

    const attempt = await prisma.otpCode.updateMany({
      where: { id: record.id, attempts: { lt: MAX_ATTEMPTS }, verified: false, expiresAt: { gt: new Date() } },
      data: { attempts: { increment: 1 } },
    });
    if (!attempt.count) return NextResponse.json({ error: "Code expired or too many attempts." }, { status: 400 });
    if (record.code !== String(code).trim()) {

      const left = MAX_ATTEMPTS - (record.attempts ?? 0) - 1;
      return NextResponse.json(
        { error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect code. Please request a new one." },
        { status: 400 }
      );
    }

    await prisma.otpCode.update({ where: { id: record.id }, data: { verified: true } });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(VERIFICATION_COOKIE, await signVerification(normPhone, record.id), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 600,
    });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: "Unable to complete this request. Please try again." }, { status: 500 });
  }
}
