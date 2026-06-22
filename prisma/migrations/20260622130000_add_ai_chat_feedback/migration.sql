-- AI Helper feedback loop tables

CREATE TABLE IF NOT EXISTS "ChatSession" (
  "id" TEXT NOT NULL,
  "browserId" TEXT NOT NULL,
  "userId" INTEGER,
  "queryText" TEXT NOT NULL,
  "language" TEXT,
  "totalSuggestions" INTEGER NOT NULL DEFAULT 0,
  "addedCount" INTEGER NOT NULL DEFAULT 0,
  "orderId" INTEGER,
  "attributedAt" TIMESTAMP(3),
  "ratingScore" INTEGER,
  "ratingComment" TEXT,
  "ratedAt" TIMESTAMP(3),
  "transcript" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatSession_browserId_idx" ON "ChatSession"("browserId");
CREATE INDEX IF NOT EXISTS "ChatSession_userId_idx" ON "ChatSession"("userId");
CREATE INDEX IF NOT EXISTS "ChatSession_startedAt_idx" ON "ChatSession"("startedAt");
CREATE INDEX IF NOT EXISTS "ChatSession_orderId_idx" ON "ChatSession"("orderId");
CREATE INDEX IF NOT EXISTS "ChatSession_ratingScore_idx" ON "ChatSession"("ratingScore");

CREATE TABLE IF NOT EXISTS "ChatSuggestion" (
  "id" SERIAL NOT NULL,
  "sessionId" TEXT NOT NULL,
  "productId" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "similarityScore" DOUBLE PRECISION,
  "thumbsUp" BOOLEAN,
  "thumbsAt" TIMESTAMP(3),
  "addedToCart" BOOLEAN NOT NULL DEFAULT false,
  "addedToCartAt" TIMESTAMP(3),
  "inOrderId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatSuggestion_sessionId_idx" ON "ChatSuggestion"("sessionId");
CREATE INDEX IF NOT EXISTS "ChatSuggestion_productId_idx" ON "ChatSuggestion"("productId");
CREATE INDEX IF NOT EXISTS "ChatSuggestion_createdAt_idx" ON "ChatSuggestion"("createdAt");

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ChatSuggestion_sessionId_fkey'
  ) THEN
    ALTER TABLE "ChatSuggestion"
      ADD CONSTRAINT "ChatSuggestion_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ChatSuggestion_productId_fkey'
  ) THEN
    ALTER TABLE "ChatSuggestion"
      ADD CONSTRAINT "ChatSuggestion_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION;
  END IF;
END $$;
