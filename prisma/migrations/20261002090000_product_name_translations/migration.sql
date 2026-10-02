-- Additive only: optional Sinhala / Tamil product names for the /si and /ta pages.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "nameSi" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "nameTa" TEXT;
