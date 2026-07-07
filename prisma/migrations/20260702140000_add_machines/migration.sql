-- Machines (industrial sewing machines — brand Prime). Separate from Product:
-- no cart/checkout. Call + WhatsApp ordering only.
CREATE TABLE IF NOT EXISTS "Machine" (
  "id" SERIAL NOT NULL,
  "modelNumber" TEXT NOT NULL,
  "brand" TEXT NOT NULL DEFAULT 'Prime',
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" TEXT,
  "price" DOUBLE PRECISION,
  "imageUrl" TEXT,
  "images" TEXT,
  "description" TEXT,
  "specs" TEXT,
  "warrantyInfo" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Machine_slug_key" ON "Machine"("slug");
CREATE INDEX IF NOT EXISTS "Machine_active_idx" ON "Machine"("active");
