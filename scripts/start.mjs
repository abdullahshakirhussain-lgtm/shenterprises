import { spawn } from "node:child_process";
let stopping = false, worker;
const web = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", process.env.PORT || "3000", "-H", "0.0.0.0"], { stdio: "inherit" });
function startWorker() {
 if (stopping) return;
 worker = spawn(process.execPath, ["--import", "tsx", "scripts/order-worker.ts"], { stdio: "inherit", env: { ...process.env, SH_WORKER: "1" } });
 worker.on("exit", () => { if (!stopping) setTimeout(startWorker, 5000); });
}
startWorker();
// One-shot: rebuild the optimized-image cache the deploy just wiped (see scripts/warm-images.ts).
const warm = spawn(process.execPath, ["--import", "tsx", "scripts/warm-images.ts"], { stdio: "inherit", env: { ...process.env, SH_WORKER: "1" } });
warm.on("error", () => {});
function stop() { stopping = true; web.kill("SIGTERM"); worker?.kill("SIGTERM"); warm.kill("SIGTERM"); }
process.on("SIGTERM", stop); process.on("SIGINT", stop);
web.on("exit", code => { stopping = true; worker?.kill("SIGTERM"); warm.kill("SIGTERM"); process.exitCode = code || 0; });
