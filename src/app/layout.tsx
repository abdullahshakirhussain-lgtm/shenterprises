import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { CartProvider } from "@/components/CartProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getServerLang } from "@/lib/i18n-server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import EasterEggs from "@/components/EasterEggs";
import NavigationOverlay from "@/components/NavigationOverlay";
import ScrollToTop from "@/components/ScrollToTop";
import MetaPixel from "@/components/MetaPixel";
import CartToast from "@/components/CartToast";
import WhatsappFab from "@/components/WhatsappFab";
import { Suspense } from "react";

// Self-hosted (latin variable fonts from Google Fonts) so builds never depend
// on fetching fonts.googleapis.com — a bad response there fails the whole build.
const lora = localFont({ src: "./fonts/lora-latin.woff2", weight: "500 700", display: "swap", variable: "--font-lora", adjustFontFallback: "Times New Roman", fallback: ["Georgia", "serif"] });
const mulish = localFont({ src: "./fonts/mulish-latin.woff2", weight: "400 800", display: "swap", variable: "--font-mulish", adjustFontFallback: "Arial", fallback: ["system-ui", "sans-serif"] });
const fraunces = localFont({
  src: "./fonts/fraunces-latin.woff2",
  weight: "400 900",
  display: "swap",
  variable: "--font-fraunces",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://shenterprises.lk"),
  title: { default: "SH Enterprises — Craft & Tailoring Supplies in Sri Lanka", template: "%s | SH Enterprises" },
  description:
    "Buy quality threads, zippers, scissors, elastics, ribbons, buttons and more craft & tailoring supplies online. Island-wide delivery across Sri Lanka. Cash on delivery available.",
  keywords: ["threads", "zippers", "buttons", "elastics", "ribbons", "scissors", "tailoring supplies", "craft supplies", "Sri Lanka", "Colombo"],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  verification: {
    google: "KrpOoUoDdsXuMPl6_sFST6GCrfX9MHjs5pd7A8zMej4",
  },
  openGraph: {
    title: "SH Enterprises — Craft & Tailoring Supplies",
    description: "Threads, zippers, scissors, elastics, ribbons, buttons & more. Island-wide delivery in Sri Lanka.",
    type: "website",
    locale: "en_LK",
    images: ["/logo.png"],
  },
  robots: { index: true, follow: true }
};

// Resilient fetchers — return empty defaults if DB is unreachable so the layout
// never crashes the whole site over a transient Supabase pooler drop.
async function safeCategories() {
  try {
    return await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  } catch (e) {
    console.warn("[layout] category fetch failed, returning empty list:", (e as any)?.message);
    return [];
  }
}
async function safeSettings(keys: string[]) {
  try {
    return await getSettings(keys);
  } catch (e) {
    console.warn("[layout] settings fetch failed, returning empty:", (e as any)?.message);
    return {} as Record<string, string>;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings] = await Promise.all([
    safeCategories(),
    safeSettings(["site_phone", "site_email", "site_address"])
  ]);

  const lang = await getServerLang();

  // Read at RUNTIME (not build-time inlined) so it survives Railway build caching.
  // Accept either name so no Railway change is needed.
  const metaPixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

  return (
    <html lang={lang} className={`${lora.variable} ${mulish.variable} ${fraunces.variable}`}>
      <body>
        {/* Seed the pixel id synchronously as the HTML parses — before hydration
            and before any component effect — so pixelTrack() in any component can
            read window.__META_PIXEL_ID regardless of effect ordering. */}
        {metaPixelId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__META_PIXEL_ID=${JSON.stringify(metaPixelId)};`,
            }}
          />
        )}
        <LanguageProvider initialLang={lang}>
        <CartProvider>
          <Header categories={categories.map((c: any) => ({
            name: c.name,
            nameSi: c.nameSi ?? null,
            nameTa: c.nameTa ?? null,
            slug: c.slug
          }))} />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <Suspense fallback={null}>
            <MetaPixel pixelId={metaPixelId} />
          </Suspense>
          <main className="min-h-[60vh]">{children}</main>
          <Footer phone={settings.site_phone} email={settings.site_email} address={settings.site_address} />
          <EasterEggs />
          <Suspense fallback={null}>
            <NavigationOverlay />
          </Suspense>
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
          <Suspense fallback={null}>
            <WhatsappFab />
          </Suspense>
          <CartToast />
        </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
