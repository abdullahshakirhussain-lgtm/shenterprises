-- Machine "call me back" leads. Idempotent so a re-run on Railway never fails.
CREATE TABLE IF NOT EXISTS "MachineLead" (
  "id"          SERIAL PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "phone"       TEXT NOT NULL,
  "message"     TEXT,
  "machineId"   INTEGER,
  "modelNumber" TEXT,
  "handled"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "MachineLead_handled_idx"   ON "MachineLead"("handled");
CREATE INDEX IF NOT EXISTS "MachineLead_createdAt_idx" ON "MachineLead"("createdAt");
