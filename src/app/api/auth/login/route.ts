import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { USER_COOKIE, signUserToken, normalizePhone } from "@/lib/userAuth";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();
    const normPhone = normalizePhone(String(phone || ""));
    if (!normPhone || !password) return NextResponse.json({ error: "Phone and password required" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { phone: normPhone } });
    if (!user) return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 });
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 });
    const token = await signUserToken({ sub: String(user.id), phone: user.phone });
    const res = NextResponse.json({ ok: true, user: { id: user.id, fullName: user.fullName, phone: user.phone, email: user.email } });
    res.cookies.set(USER_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 30
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
