import test from "node:test";
import assert from "node:assert/strict";
import { safeNextPath, unitLabel, formatLKR } from "../src/lib/utils";
test("post-login redirect stays on this site", () => {
 assert.equal(safeNextPath("/checkout"), "/checkout");
 assert.equal(safeNextPath("https://evil.example"), "/account");
 assert.equal(safeNextPath("//evil.example"), "/account");
 assert.equal(safeNextPath("/\\evil.example"), "/account");
 assert.equal(safeNextPath(null), "/account");
});
test("unit labels drop '1 pieces' and singularise single units", () => {
 assert.equal(unitLabel(1, "pieces"), null);
 assert.equal(unitLabel(1, "yards"), "1 yard");
 assert.equal(unitLabel(25, "pieces"), "25 pieces");
 assert.equal(unitLabel(null, "pieces"), null);
});
test("prices drop .00 but keep real cents", () => {
 assert.equal(formatLKR(120), "Rs. 120");
 assert.equal(formatLKR(9500), "Rs. 9,500");
 assert.equal(formatLKR(12.5), "Rs. 12.50");
});
