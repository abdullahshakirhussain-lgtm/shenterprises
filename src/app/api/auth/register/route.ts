import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { USER_COOKIE, signUserToken, normalizePhone } from "@/lib/userAuth";

export async function POST(req: NextRequest) {
  try {
    const { fullName, phone, password } = await req.json();
    if (!fullName || !phone || !password) return NextResponse.json({ error: "Name, phone and password are required" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const normPhone = normalizePhone(String(phone));
    if (!normPhone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    // Check OTP was verified for this phone
    const otp = await prisma.otpCode.findFirst({
      where: { phone: normPhone, verified: true },
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
    const user = await prisma.user.create({
      data: { phone: normPhone, fullName: String(fullName), passwordHash }
    });

    // Clean up OTP records for this phone
    await prisma.otpCode.deleteMany({ where: { phone: normPhone } });

    const token = await signUserToken({ sub: String(user.id), phone: user.phone });
    const res = NextResponse.json({ ok: true, user: { id: user.id, fullName: user.fullName, phone: user.phone } });
    res.cookies.set(USER_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 30
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
