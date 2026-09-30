import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
 const params = await props.params;
 const id = params.id.replace(/\.(pdf|png|jpg|webp)$/, "");
 if (!/^[a-f0-9-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
 const slip = await prisma.bankSlip.findUnique({ where: { id }, select: { sessionId: true } });
 if (!slip || (!(await getCurrentAdmin()) && slip.sessionId !== req.cookies.get("sh_sid")?.value))
 return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
 const data = await prisma.bankSlip.findUniqueOrThrow({ where: { id } });
 return new NextResponse(new Uint8Array(data.body), { headers: { "Content-Type": data.contentType, "Cache-Control": "private, no-store",
 "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
}
