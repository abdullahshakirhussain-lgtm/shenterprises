import test from "node:test";
import assert from "node:assert/strict";
import { readBody, readJson } from "../src/lib/requestBody";
test("body limits apply even without a Content-Length header", async () => {
 const request = new Request("http://localhost", { method: "POST", body: "123456" });
 await assert.rejects(readBody(request, 5), /too large/);
});
test("valid JSON is preserved and malformed JSON rejected", async () => {
 assert.deepEqual(await readJson(new Request("http://localhost", { method:"POST", body:'{"ok":true}' })), {ok:true});
 await assert.rejects(readJson(new Request("http://localhost", {method:"POST", body:"{"})));
});
