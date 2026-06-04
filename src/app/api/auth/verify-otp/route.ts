import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/userAuth";

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });

    const normPhone = normalizePhone(String(phone));
    if (!normPhone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    const record = await prisma.otpCode.findFirst({
      where: { phone: normPhone, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return NextResponse.json({ error: "No OTP found for this number. Please request a new one." }, { status: 400 });
    if (record.expiresAt < new Date()) return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    if (record.code !== String(code).trim()) return NextResponse.json({ error: "Incorrect OTP code." }, { status: 400 });

    await prisma.otpCode.update({ where: { id: record.id }, data: { verified: true } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
