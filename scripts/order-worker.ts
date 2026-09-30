import { drainOrderJobs } from "../src/lib/orderJobs";
import { prisma } from "../src/lib/prisma";
let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
async function main() {
 while (!stopping) {
  try { await drainOrderJobs(); } catch { console.warn("[order-worker] Retry deferred; saved jobs retained."); }
  if (!stopping) await new Promise(resolve => setTimeout(resolve, 30000));
 }
 await prisma.$disconnect();
}
void main();
