import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/userAuth";
import { sendSms } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });

    const normPhone = normalizePhone(String(phone));
    if (!normPhone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { phone: normPhone } });
    if (existing) return NextResponse.json({ error: "An account with this phone already exists" }, { status: 409 });

    // Rate-limit: max one OTP every 60 seconds per phone to prevent abuse / billing surprises
    const lastRecent = await prisma.otpCode.findFirst({
      where: { phone: normPhone, createdAt: { gte: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: "desc" },
    });
    if (lastRecent) {
      return NextResponse.json(
        { error: "Please wait a minute before requesting another code." },
        { status: 429 }
      );
    }

    // Delete any old OTPs for this phone
    await prisma.otpCode.deleteMany({ where: { phone: normPhone } });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpCode.create({ data: { phone: normPhone, code, expiresAt } });

    // Send via Notify.lk (falls back to console log if env vars not configured)
    const message = `Your SH Enterprises code is ${code}. It expires in 10 minutes.`;
    const smsResult = await sendSms(normPhone, message);

    if (!smsResult.ok) {
      // SMS failed — clean up the unused code so the user isn't locked out and
      // surface a clear error so they know to retry
      await prisma.otpCode.deleteMany({ where: { phone: normPhone, code } });
      console.warn(`[send-otp] SMS failed via ${smsResult.provider}:`, smsResult.error);
      return NextResponse.json(
        { error: "Couldn't send the verification code right now. Please try again in a moment." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
