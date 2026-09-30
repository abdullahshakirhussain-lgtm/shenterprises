import { readJson } from "@/lib/requestBody";
import { persistentRateLimit } from "@/lib/persistentRateLimit";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRegistration, VERIFICATION_COOKIE } from "@/lib/verification";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";
import { USER_COOKIE, signUserToken, normalizePhone } from "@/lib/userAuth";

export async function POST(req: NextRequest) {
  try {
    if (!(await persistentRateLimit("register:" + clientIp(req), 10, 600)).ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    if (!rateLimit("register:" + clientIp(req), 10, 600).ok) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
    const { fullName, phone, password } = await readJson(req);
    if (!fullName || !phone || !password) return NextResponse.json({ error: "Name, phone and password are required" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const normPhone = normalizePhone(String(phone));
    if (!normPhone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    const proof = await verifyRegistration(req.cookies.get(VERIFICATION_COOKIE)?.value);
    if (!proof || proof.phone !== normPhone) return NextResponse.json({ error: "Please verify your phone again." }, { status: 400 });
    // Check OTP was verified for this phone
    const otp = await prisma.otpCode.findFirst({
      where: { id: proof.otpId, phone: normPhone, verified: true },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) return NextResponse.json({ error: "Phone number not verified. Please complete OTP verification first." }, { status: 400 });
    // OTP verification must be recent (within 30 min)
    if (otp.createdAt < new Date(Date.now() - 30 * 60 * 1000)) {
      return NextResponse.json({ error: "OTP session expired. Please verify your phone again." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { phone: normPhone } });
    if (existing) return NextResponse.json({ error: "An account with this phone already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await prisma.$transaction(async tx => {
      const consumed = await tx.otpCode.updateMany({ where: { id: proof.otpId, phone: normPhone, verified: true }, data: { verified: false } });
      if (!consumed.count) throw new Error("Verification already used. Please verify again.");
      return tx.user.create({ data: { phone: normPhone, fullName: String(fullName).slice(0, 200), passwordHash } });
    });

    const token = await signUserToken({ sub: String(user.id), phone: user.phone });
    const res = NextResponse.json({ ok: true, user: { id: user.id, fullName: user.fullName, phone: user.phone } });
    res.cookies.set(USER_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 30
    });
    res.cookies.delete(VERIFICATION_COOKIE);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: "Unable to complete this request. Please try again." }, { status: 500 });
  }
}
