import { drainOrderJobs } from "../src/lib/orderJobs";
import { queueReviewRequests } from "../src/lib/reviewRequests";
import { prisma } from "../src/lib/prisma";
let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
let lastReviewScan = 0;
async function main() {
 while (!stopping) {
  // Every 10 minutes: queue review-request texts for orders shipped 4+ days ago.
  if (Date.now() - lastReviewScan > 600_000) {
   lastReviewScan = Date.now();
   try { await queueReviewRequests(); } catch { console.warn("[order-worker] Review scan deferred."); }
  }
  try { await drainOrderJobs(); } catch { console.warn("[order-worker] Retry deferred; saved jobs retained."); }
  if (!stopping) await new Promise(resolve => setTimeout(resolve, 30000));
 }
 await prisma.$disconnect();
}
void main();
