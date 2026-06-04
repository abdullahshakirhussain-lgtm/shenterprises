import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/userAuth";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });

    const normPhone = normalizePhone(String(phone));
    if (!normPhone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { phone: normPhone } });
    if (existing) return NextResponse.json({ error: "An account with this phone already exists" }, { status: 409 });

    // Delete any old OTPs for this phone
    await prisma.otpCode.deleteMany({ where: { phone: normPhone } });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpCode.create({ data: { phone: normPhone, code, expiresAt } });

    // Mock mode: log to console. Replace this block with real SMS provider later.
    console.log(`\n[OTP] Phone: ${normPhone}  Code: ${code}  (expires ${expiresAt.toISOString()})\n`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
