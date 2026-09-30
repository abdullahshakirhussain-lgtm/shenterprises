-- Additive only: no existing rows, columns, constraints or files are removed.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutKey" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_checkoutKey_key" ON "Order"("checkoutKey");
CREATE TABLE IF NOT EXISTS "OrderJob" (
 "id" SERIAL PRIMARY KEY, "orderId" INTEGER NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "kind" TEXT NOT NULL, "context" TEXT, "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lockedAt" TIMESTAMP(3),
 "completedAt" TIMESTAMP(3), "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrderJob_orderId_kind_key" ON "OrderJob"("orderId","kind");
CREATE INDEX IF NOT EXISTS "OrderJob_completedAt_nextAttemptAt_idx" ON "OrderJob"("completedAt","nextAttemptAt");

CREATE TABLE IF NOT EXISTS "BankSlip" (
 "id" TEXT PRIMARY KEY, "sessionId" TEXT NOT NULL, "contentType" TEXT NOT NULL,
 "body" BYTEA NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BankSlip_sessionId_idx" ON "BankSlip"("sessionId");

CREATE TABLE IF NOT EXISTS "RateLimitBucket" ("id" TEXT PRIMARY KEY, "count" INTEGER NOT NULL, "resetAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_type_createdAt_sessionId_idx" ON "AnalyticsEvent" ("type", "createdAt", "sessionId");
