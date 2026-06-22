-- Enable pgvector and add embedding column to Product
-- This migration is idempotent — safe to re-run

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_product_embedding
  ON "Product" USING ivfflat (embedding vector_cosine_ops);
