// Production startup: ensure tables exist, then seed only if DB is empty.
// Safe to run on every boot — seed uses upsert so it's idempotent.
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("→ Applying schema (prisma db push)…");
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      env: process.env
    });
  } catch (e) {
    console.error("Schema push failed:", e);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      console.log("→ Empty DB detected — running seed…");
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
    } else {
      console.log(`→ Admin user already exists (${adminCount}), skipping seed.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
