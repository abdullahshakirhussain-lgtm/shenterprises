import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "./lib/authTokens";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const expected = new URL(process.env.SITE_URL || "https://shenterprises.lk").origin;
    const own = req.nextUrl.origin;
    if (origin && origin !== expected && origin !== own) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Force HTTPS in production — required for secure cookies to work
  if (process.env.NODE_ENV === "production") {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto && proto !== "https") {
      const url = req.nextUrl.clone();
      url.protocol = "https:";
      return NextResponse.redirect(url, 308);
    }
  }

  // Sinhala / Tamil URLs: /si/... and /ta/... serve the same pages in that language
  // (so Google can index them — a cookie alone is invisible to crawlers). Only the
  // translated shop pages exist under a prefix; anything else drops the prefix.
  const langMatch = pathname.match(/^\/(si|ta)(\/.*)?$/);
  if (langMatch) {
    const lang = langMatch[1];
    const rest = langMatch[2] || "/";
    const url = req.nextUrl.clone();
    url.pathname = rest;
    if (!LOCALIZED_PATH.test(rest)) return NextResponse.redirect(url, 308);
    const headers = new Headers(req.headers);
    headers.set("x-sh-lang", lang);
    const res = NextResponse.rewrite(url, { request: { headers } });
    // Keep the visitor in this language as they click through unprefixed links.
    res.cookies.set("sh_lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
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
  // Never trust a language header sent by the browser — only the rewrite above sets it.
  if (req.headers.has("x-sh-lang")) {
    const headers = new Headers(req.headers);
    headers.delete("x-sh-lang");
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

/** Pages that have Sinhala / Tamil versions (see lib/seoLang.ts). */
const LOCALIZED_PATH = /^\/($|shop$|offers$|category\/[^/]+$|product\/[^/]+$)/;

export const config = {
  // Match all routes EXCEPT Next.js internals, static assets, and the served upload files.
  // This ensures HTTPS redirect applies site-wide while still letting non-admin pages render normally.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|uploads/).*)",
  ]
};
