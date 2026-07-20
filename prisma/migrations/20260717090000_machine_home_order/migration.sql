-- Homepage feature-strip ordering for machines. Idempotent for safe re-runs.
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "homeOrder" INTEGER;
