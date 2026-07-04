-- Owned-analytics phone linking. Hash for matching, last-4 for eyeball recognition.
-- Full customer numbers are NOT stored here (they live in Order/OMS).
ALTER TABLE "AnalyticsSession" ADD COLUMN IF NOT EXISTS "phoneHash"  TEXT;
ALTER TABLE "AnalyticsSession" ADD COLUMN IF NOT EXISTS "phoneLast4" TEXT;

CREATE INDEX IF NOT EXISTS "AnalyticsSession_phoneHash_idx" ON "AnalyticsSession"("phoneHash");
