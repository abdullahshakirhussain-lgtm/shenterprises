"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Floating signup prompt — bottom-right of the screen.
 * Shows once per browser session for guest users, pulling the live discount
 * values from /api/settings/public so the offer always matches the admin config.
 *
 * Triggers (whichever fires first):
 *   - 12 seconds on the site
 *   - 2 distinct product pages visited
 *
 * Suppressed when:
 *   - The user is logged in
 *   - User already dismissed this session
 *   - On the registration / login pages themselves
 *   - On the admin pages
 */

const SESSION_FLAG = "sh_signup_nudge_seen_v1";
const PRODUCT_PATH = /^\/product\//;

export default function SignupNudge() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [memberDiscount, setMemberDiscount] = useState(0);
  const [firstOrderDiscount, setFirstOrderDiscount] = useState(0);

  useEffect(() => {
    // Don't show on auth pages or admin
    if (!pathname) return;
    if (pathname.startsWith("/account") || pathname.startsWith("/admin")) return;

    // Already shown this session
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_FLAG) === "1"; } catch {}
    if (seen) return;

    let cancelled = false;
    let timer: any = null;

    // Fetch settings + auth state in parallel
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()).catch(() => ({ user: null })),
      fetch("/api/settings/public").then(r => r.json()).catch(() => ({})),
    ]).then(([authData, settings]) => {
      if (cancelled) return;
      if (authData?.user) return; // logged in — never nudge

      const member = parseFloat(settings?.account_discount_percent || "0");
      if (!isNaN(member)) setMemberDiscount(member);
      try {
        const tiers = JSON.parse(settings?.new_customer_tiers || "[]");
        const first = tiers.find((t: any) => t?.order === 1);
        if (first?.percent) setFirstOrderDiscount(first.percent);
      } catch {}

      // Track product-page views
      let productCount = 0;
      try {
        const raw = sessionStorage.getItem("sh_product_views");
        productCount = raw ? parseInt(raw, 10) || 0 : 0;
      } catch {}
      if (PRODUCT_PATH.test(pathname)) {
        productCount += 1;
        try { sessionStorage.setItem("sh_product_views", String(productCount)); } catch {}
      }

      // Decide whether to show now or wait
      if (productCount >= 2) {
        setVisible(true);
        return;
      }
      timer = setTimeout(() => setVisible(true), 12_000);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  function dismiss() {
    setVisible(false);
    try { sessionStorage.setItem(SESSION_FLAG, "1"); } catch {}
  }

  if (!visible) return null;

  // Pick the strongest available offer to lead with
  const hasFirstOrder = firstOrderDiscount > 0;
  const hasMember = memberDiscount > 0;

  return (
    <div
      role="dialog"
      aria-label="Sign up for discounts"
      className="fixed bottom-4 right-4 z-40 max-w-[320px] w-[calc(100vw-2rem)] sm:w-80 animate-[slideIn_.35s_ease-out]"
      style={{ animationName: "slideIn" } as any}
    >
      <div className="relative rounded-2xl bg-white border border-saffron-300 shadow-2xl overflow-hidden stitched">
        {/* Saffron accent strip */}
        <div className="h-1 bg-gradient-to-r from-saffron-400 via-saffron-500 to-saffron-600" />
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full text-ink-mute hover:bg-saffron-50 hover:text-ink transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
        <div className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-saffron-700 mb-1">
            Member perk
          </p>
          {hasFirstOrder ? (
            <h3 className="font-display font-semibold text-xl text-ink leading-tight">
              Get <span className="text-saffron-600">{firstOrderDiscount}% off</span> your first order
            </h3>
          ) : hasMember ? (
            <h3 className="font-display font-semibold text-xl text-ink leading-tight">
              Members get <span className="text-saffron-600">{memberDiscount}% off</span> every order
            </h3>
          ) : (
            <h3 className="font-display font-semibold text-xl text-ink leading-tight">
              Create your account
            </h3>
          )}

          <p className="text-sm text-ink-mute mt-1.5">
            {hasFirstOrder && hasMember ? (
              <>Plus {memberDiscount}% off on every order after that.</>
            ) : hasFirstOrder ? (
              <>Sign up in 30 seconds with just your phone number.</>
            ) : hasMember ? (
              <>Sign up in 30 seconds with just your phone number.</>
            ) : (
              <>Save your address, track orders, and get exclusive offers.</>
            )}
          </p>

          <div className="mt-4 flex gap-2">
            <Link
              href="/account/register"
              onClick={dismiss}
              className="flex-1 rounded-xl bg-ink hover:bg-ink-soft text-cream text-sm font-bold py-2.5 transition-colors text-center"
            >
              Sign up free
            </Link>
            <button
              onClick={dismiss}
              className="text-xs text-ink-mute hover:text-ink underline px-2"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
