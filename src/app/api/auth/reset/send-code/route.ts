import { readJson } from "@/lib/requestBody";
import { persistentRateLimit } from "@/lib/persistentRateLimit";
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/userAuth";
import { sendSms } from "@/lib/sms";

// Password reset, step 1: text a 6-digit code to the account's phone.
// Always answers the same way whether or not the number has an account, so the
// form can't be used to discover which phone numbers are registered.
export async function POST(req: NextRequest) {
  try {
    if (!(await persistentRateLimit("reset:" + clientIp(req), 6, 600)).ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    if (!rateLimit("reset-send:" + clientIp(req), 6, 600).ok) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
    const { phone } = await readJson(req);
    const normPhone = normalizePhone(String(phone || ""));
    if (!normPhone) return NextResponse.json({ error: "Enter the 10-digit phone number you registered with." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phone: normPhone }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: true });

    // At most one code a minute per phone (abuse / SMS cost guard).
    const recent = await prisma.otpCode.findFirst({ where: { phone: normPhone, createdAt: { gte: new Date(Date.now() - 60_000) } } });
    if (recent) return NextResponse.json({ error: "Please wait a minute before requesting another code." }, { status: 429 });

    await prisma.otpCode.deleteMany({ where: { phone: normPhone } });
    const code = String(randomInt(100000, 1000000));
    await prisma.otpCode.create({ data: { phone: normPhone, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });

    const sms = await sendSms(normPhone, `Your SH Enterprises password reset code is ${code}. It expires in 10 minutes. If you didn't ask for this, ignore this message.`);
    if (!sms.ok) {
      await prisma.otpCode.deleteMany({ where: { phone: normPhone, code } });
      return NextResponse.json({ error: "Couldn't send the code right now. Please try again in a moment." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to complete this request. Please try again." }, { status: 500 });
  }
}
