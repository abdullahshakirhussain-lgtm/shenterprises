-- Explicit availability flag — replaces numeric stock tracking for the
-- availability check. Both default to false (= available) so all existing
-- products immediately become orderable again.

ALTER TABLE "Product"        ADD COLUMN IF NOT EXISTS "outOfStock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "outOfStock" BOOLEAN NOT NULL DEFAULT false;
