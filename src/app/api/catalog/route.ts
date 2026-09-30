import { NextRequest, NextResponse } from "next/server";
import { catalogPage } from "@/lib/catalog";
import { rateLimit, clientIp } from "@/lib/rateLimit";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
 if(!rateLimit("catalog:"+clientIp(req),90,60).ok)return NextResponse.json({error:"Please wait and try again."},{status:429});
 const cursor=Number(req.nextUrl.searchParams.get("cursor"));
 const page=await catalogPage(req.nextUrl.searchParams.get("q")||"",Number.isInteger(cursor)&&cursor>0?cursor:undefined);
 return NextResponse.json(page,{headers:{"Cache-Control":"no-store"}});
}
