import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/analytics";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * "Leave your number, we'll call you back" lead from a machine page.
 *
 * Stores the full name + phone in MachineLead (the shop needs them to call back
 * — this is a consented contact request, not passive tracking). The parallel
 * owned-analytics event keeps only the model + last-4 of the phone, matching the
 * hash/last-4 rule the rest of analytics follows.
 *
 * The Meta "Lead" conversion (deduped browser + CAPI, hashed phone) is fired by
 * the client via pixelTrack — not here — so we don't double-count it.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`machine-lead:${clientIp(req)}`, 8, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const name = String(body?.name || "").trim().slice(0, 120);
  const phoneRaw = String(body?.phone || "").trim().slice(0, 40);
  const message = String(body?.message || "").trim().slice(0, 800) || null;
  const machineId = Number.isFinite(body?.machineId) ? Number(body.machineId) : null;
  const modelNumber = body?.modelNumber ? String(body.modelNumber).slice(0, 60) : null;

  // Minimal validation — a name and a plausibly-real phone number.
  const phoneDigits = phoneRaw.replace(/\D/g, "");
  if (!name || phoneDigits.length < 9) {
    return NextResponse.json({ ok: false, error: "Please enter your name and a valid phone number." }, { status: 400 });
  }

  try {
    await prisma.machineLead.create({
      data: { name, phone: phoneRaw, message, machineId: machineId ?? undefined, modelNumber: modelNumber ?? undefined },
    });
  } catch (e: any) {
    console.warn("[machine-lead] store failed:", e?.message);
    return NextResponse.json({ ok: false, error: "Could not save — please call us instead." }, { status: 500 });
  }

  // Owned analytics — never the full number here, only the last 4 for eyeballing.
  await recordEvent({
    type: "machine_lead",
    productId: machineId ?? undefined,
    meta: { name, phoneLast4: phoneDigits.slice(-4), modelNumber, machineId },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
