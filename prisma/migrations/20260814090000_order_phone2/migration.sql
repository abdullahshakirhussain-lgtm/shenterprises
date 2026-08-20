-- Optional second contact number on orders. Idempotent for safe re-runs.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "phone2" TEXT;
