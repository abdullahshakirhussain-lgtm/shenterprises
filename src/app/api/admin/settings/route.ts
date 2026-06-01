import { NextRequest, NextResponse } from "next/server";
import { setSetting } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const body: Record<string, any> = await req.json();
    await Promise.all(Object.entries(body).map(([k, v]) => setSetting(k, String(v ?? ""))));
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
