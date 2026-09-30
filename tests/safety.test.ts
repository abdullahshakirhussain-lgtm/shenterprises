import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isPrivatePath, cleanTrackingPath } from "../src/lib/trackingPaths";
test("private route identifiers never enter tracking paths",()=>{
 for(const path of ["/admin","/admin/orders/1","/order/secret","/account","/track","/checkout/success"])assert.ok(isPrivatePath(path));
 assert.equal(isPrivatePath("/product/thread"),false);
 assert.equal(cleanTrackingPath("/shop?email=private&order=123&utm_source=ads"),"/shop?utm_source=ads");
});
test("migration adds only and startup cannot run destructive schema synchronization",()=>{
 const sql=fs.readFileSync("prisma/migrations/202609120001_order_reliability/migration.sql","utf8").replace(/--[^\n]*/g,"");
 assert.doesNotMatch(sql,/\b(DROP|DELETE|TRUNCATE)\b(?!\s+RESTRICT)/i);
 assert.doesNotMatch(fs.readFileSync("prisma/init.ts","utf8"),/accept-data-loss|execSync/);
 assert.doesNotMatch(JSON.parse(fs.readFileSync("package.json","utf8")).scripts.start,/db push|seed|init\.ts/);
});
