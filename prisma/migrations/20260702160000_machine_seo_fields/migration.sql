-- Machine SEO: cross-brand equivalents, FAQ, and an optional intro paragraph.
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "equivalents" TEXT;
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "faq"         TEXT;
ALTER TABLE "Machine" ADD COLUMN IF NOT EXISTS "seoIntro"    TEXT;
