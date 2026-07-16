-- Machine type hubs (SEO head-term pages). Idempotent so a re-run on Railway never fails.
CREATE TABLE IF NOT EXISTS "MachineType" (
  "id"        SERIAL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "blurb"     TEXT,
  "seoIntro"  TEXT,
  "faq"       TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "MachineType_name_key" ON "MachineType"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "MachineType_slug_key" ON "MachineType"("slug");
