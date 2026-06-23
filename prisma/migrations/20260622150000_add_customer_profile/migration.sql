-- Customer profiling foundation
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "CustomerProfile" (
  "id" SERIAL NOT NULL,
  "browserId" TEXT NOT NULL,
  "userId" INTEGER,

  "customerType" TEXT NOT NULL DEFAULT 'unknown',
  "typeConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,

  "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ltv" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "aov" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "cartAbandonmentRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountResponsiveness" DOUBLE PRECISION NOT NULL DEFAULT 0,

  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastOrderAt" TIMESTAMP(3),

  "topCategories"     TEXT,
  "topPriceRange"     DOUBLE PRECISION,
  "preferredLanguage" TEXT,
  "deviceClass"       TEXT,

  "interestVector"    vector(1536),

  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerProfile_browserId_key" ON "CustomerProfile"("browserId");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerProfile_userId_key" ON "CustomerProfile"("userId");
CREATE INDEX IF NOT EXISTS "CustomerProfile_customerType_idx" ON "CustomerProfile"("customerType");
CREATE INDEX IF NOT EXISTS "CustomerProfile_lastSeenAt_idx"  ON "CustomerProfile"("lastSeenAt");
