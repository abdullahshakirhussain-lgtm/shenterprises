import { contentId } from "./contentId";
import { prisma } from "./prisma";
import { sendSms } from "./sms";
import { normalizePhone } from "./userAuth";
import { sendMetaEvent } from "./metaEvents";
import { attachPhoneToSession } from "./analytics";

// Durable jobs are saved with the order. Leases allow safe retry after a process restart.
// SMS is at-least-once: a crash after gateway acceptance can cause a repeated message.
// Retired kinds (e.g. the removed AI-helper "attribution") fall through and are marked complete.
export async function drainOrderJobs(orderId?: number) {
 const now = new Date();
 const jobs = await prisma.orderJob.findMany({
 where: { ...(orderId ? { orderId } : {}), completedAt: null, nextAttemptAt: { lte: now },
 OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - 120000) } }] },
 orderBy: { nextAttemptAt: "asc" }, take: 12,
 });
 for (const job of jobs) {
 const lease = await prisma.orderJob.updateMany({ where: { id: job.id, completedAt: null,
 OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - 120000) } }] },
 data: { lockedAt: now, attempts: { increment: 1 } } });
 if (!lease.count) continue;
 try {
 const order = await prisma.order.findUniqueOrThrow({ where: { id: job.orderId }, include: { items: { include: { product: { select: { sku: true } } } } } });
 if (job.kind === "sms") {
 const phone = normalizePhone(order.phone);
 if (!phone) throw new Error("Invalid order phone");
 const base = process.env.SITE_URL || "https://shenterprises.lk";
 const result = await sendSms(phone, "SH Enterprises: Order " + order.orderNumber + " received. Total Rs " +
 Math.round(order.total).toLocaleString("en-US") + ". Receipt: " + base + "/order/" + order.orderNumber);
 if (!result.ok) throw new Error("SMS delivery failed");
 } else if (job.kind === "meta") {
 const context = JSON.parse(job.context || "{}");
 const result = await sendMetaEvent({
 event_name: "Purchase", event_id: "purchase:" + order.orderNumber,
 event_time: Math.floor(order.createdAt.getTime() / 1000), event_source_url: (process.env.SITE_URL || "https://shenterprises.lk") + "/checkout",
 user_data: { ...context, phone: order.phone, email: order.email, fullName: order.fullName },
 custom_data: { value: order.total, currency: "LKR", content_type: "product",
 content_ids: order.items.map(i => contentId({ sku: i.product.sku, id: i.productId })), num_items: order.items.reduce((sum, i) => sum + i.quantity, 0) },
 });
 if (!result.ok) throw new Error("Conversion delivery unavailable");
 } else if (job.kind === "analytics" && order.sessionId) {
 await prisma.$transaction(async tx => {
 await tx.analyticsSession.upsert({ where: { id: order.sessionId! }, update: { lastSeen: new Date() }, create: { id: order.sessionId!, source: order.source || "direct" } });
 const session = await tx.analyticsSession.findUnique({ where: { id: order.sessionId! }, select: { source: true } });
 if (session?.source && !order.source) await tx.order.update({ where: { id: order.id }, data: { source: session.source } });
 await tx.analyticsEvent.create({ data: { sessionId: order.sessionId!, type: "purchase", value: order.total, meta: JSON.stringify({ orderNumber: order.orderNumber }) } });
 await tx.cart.updateMany({ where: { id: order.sessionId! }, data: { abandoned: false } });
 await tx.orderJob.update({ where: { id: job.id }, data: { completedAt: new Date(), lockedAt: null, lastError: null } });
 });
 await attachPhoneToSession(order.sessionId, order.phone);
 continue;
 }
 await prisma.orderJob.update({ where: { id: job.id }, data: { completedAt: new Date(), lockedAt: null, lastError: null } });
 } catch {
 await prisma.orderJob.update({ where: { id: job.id }, data: { lockedAt: null, lastError: "Delivery failed; retained for retry",
 nextAttemptAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(job.attempts, 7))) } }).catch(() => {});
 }
 }
}
