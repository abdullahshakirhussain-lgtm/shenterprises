import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Force HTTPS in production — required for secure cookies to work
  if (process.env.NODE_ENV === "production") {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto && proto !== "https") {
      const url = req.nextUrl.clone();
      url.protocol = "https:";
      return NextResponse.redirect(url, 308);
    }
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const ok = token ? await verifyAdminToken(token) : null;
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith("/api/admin") && pathname !== "/api/admin/login") {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const ok = token ? await verifyAdminToken(token) : null;
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  // Match all routes EXCEPT Next.js internals, static assets, and the served upload files.
  // This ensures HTTPS redirect applies site-wide while still letting non-admin pages render normally.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|uploads/).*)",
  ]
};
