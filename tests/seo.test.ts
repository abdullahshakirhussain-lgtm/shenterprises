import test from "node:test";
import assert from "node:assert/strict";
import { langPath } from "../src/lib/seoLang";
import { newReviewCode, reviewerName } from "../src/lib/reviewRequests";
test("language URLs", () => {
 assert.equal(langPath("/", "si"), "/si");
 assert.equal(langPath("/product/x", "ta"), "/ta/product/x");
 assert.equal(langPath("/shop", "en"), "/shop");
});
test("review links are short, URL-safe and unpredictable", () => {
 const a = newReviewCode(), b = newReviewCode();
 assert.match(a, /^[A-Za-z0-9]{10}$/);
 assert.notEqual(a, b);
});
test("reviews show first name + last initial", () => {
 assert.equal(reviewerName("Nimal Perera"), "Nimal P.");
 assert.equal(reviewerName("Fathima"), "Fathima");
});
