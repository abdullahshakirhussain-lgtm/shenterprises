import { NextRequest, NextResponse } from "next/server";
import { parseCSV } from "@/lib/csv";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
    const text = await file.text();
    const { headers, rows } = parseCSV(text);
    return NextResponse.json({ headers, rows: rows.slice(0, 5) });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
