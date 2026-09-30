import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { signAdminToken, verifyAdminToken } from "../src/lib/authTokens";
import { signUserToken, verifyUserToken } from "../src/lib/userAuth";
import { signVerification, verifyRegistration } from "../src/lib/verification";
process.env.AUTH_SECRET="isolated-tests-only-not-a-deployment-secret";
test("customer and administrator tokens cannot be interchanged",async()=>{
 const admin=await signAdminToken({sub:"1",username:"owner"}),customer=await signUserToken({sub:"1",phone:"94770000000"});
 assert.ok(await verifyAdminToken(admin));assert.ok(await verifyUserToken(customer));
 assert.equal(await verifyAdminToken(customer),null);assert.equal(await verifyUserToken(admin),null);
});
test("legacy and malformed tokens are rejected",async()=>{
 const legacy=await new SignJWT({sub:"1",username:"owner"}).setProtectedHeader({alg:"HS256"}).sign(new TextEncoder().encode(process.env.AUTH_SECRET));
 assert.equal(await verifyAdminToken(legacy),null);assert.equal(await verifyAdminToken("bad"),null);
 assert.equal(await verifyAdminToken(await signAdminToken({sub:"oops",username:"owner"})),null);
});
test("registration proof binds phone and OTP and rejects other tokens",async()=>{
 const token=await signVerification("94770000000",12);
 assert.deepEqual(await verifyRegistration(token),{phone:"94770000000",otpId:12});
 assert.equal(await verifyRegistration(await signAdminToken({sub:"1",username:"owner"})),null);
 assert.equal(await verifyRegistration(token+"tampered"),null);
});
