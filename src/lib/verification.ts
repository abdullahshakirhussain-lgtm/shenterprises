import { SignJWT, jwtVerify } from "jose";
export const VERIFICATION_COOKIE = "sh_registration";
function secret() {
 const value = process.env.AUTH_SECRET;
 if (!value || value.length < 16) throw new Error("Authentication is not configured");
 return new TextEncoder().encode(value);
}
export async function signVerification(phone: string, id: number) {
 return new SignJWT({ phone, otpId: id }).setProtectedHeader({ alg: "HS256" }).setIssuer("shenterprises").setAudience("registration").setExpirationTime("10m").sign(secret());
}
export async function verifyRegistration(token: string | undefined) {
 if (!token) return null;
 try {
 const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], issuer: "shenterprises", audience: "registration" });
 return typeof payload.phone === "string" && Number.isInteger(payload.otpId) ? { phone: payload.phone, otpId: payload.otpId as number } : null;
 } catch { return null; }
}
