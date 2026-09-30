import test from "node:test";
import assert from "node:assert/strict";
import { memo, invalidateCatalog } from "../src/lib/memo";
test("repeat reads are served from memory", async () => {
 let calls = 0;
 const load = async () => { calls++; return { price: 100 }; };
 await memo("t:hit", load); await memo("t:hit", load);
 assert.equal(calls, 1);
});
test("a catalog write makes the very next read fresh", async () => {
 let price = 100;
 const load = async () => ({ price });
 assert.equal((await memo("t:inv", load)).price, 100);
 price = 80; invalidateCatalog();
 assert.equal((await memo("t:inv", load)).price, 80);
});
test("callers cannot mutate the shared copy; dates survive", async () => {
 const load = async () => ({ items: [1, 2], at: new Date(0) });
 const a = await memo("t:clone", load); a.items.push(3);
 const b = await memo("t:clone", load);
 assert.deepEqual(b.items, [1, 2]);
 assert.ok(b.at instanceof Date);
});
test("failures are not cached; an older copy is served instead", async () => {
 let fail = false;
 const load = async () => { if (fail) throw new Error("db down"); return { ok: 1 }; };
 await memo("t:err", load);
 fail = true; invalidateCatalog();
 assert.deepEqual(await memo("t:err", load), { ok: 1 });
 await assert.rejects(memo("t:err-new", load));
 fail = false;
 assert.deepEqual(await memo("t:err-new", load), { ok: 1 });
});
test("concurrent misses share one database load", async () => {
 let calls = 0;
 const load = async () => { calls++; await new Promise(r => setTimeout(r, 20)); return 1; };
 await Promise.all([memo("t:flight", load), memo("t:flight", load), memo("t:flight", load)]);
 assert.equal(calls, 1);
});
