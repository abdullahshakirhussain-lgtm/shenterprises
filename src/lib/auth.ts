import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { ADMIN_COOKIE, verifyAdminToken } from "./authTokens";
export { ADMIN_COOKIE, signAdminToken, verifyAdminToken } from "./authTokens";

export async function getCurrentAdmin() {
 const token = (await cookies()).get(ADMIN_COOKIE)?.value;
 if (!token) return null;
 const identity = await verifyAdminToken(token);
 if (!identity) return null;
 const admin = await prisma.admin.findUnique({ where: { id: Number(identity.sub) }, select: { username: true } });
 return admin?.username === identity.username ? identity : null;
}
