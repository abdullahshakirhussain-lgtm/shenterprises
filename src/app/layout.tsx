import "./globals.css";
import type { Metadata } from "next";
import { Lora, Mulish, Fraunces } from "next/font/google";
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
import SignupNudge from "@/components/SignupNudge";
import { Suspense } from "react";

const lora = Lora({ subsets: ["latin"], weight: ["500","600","700"], display: "swap", variable: "--font-lora" });
const mulish = Mulish({ subsets: ["latin"], weight: ["400","500","600","700","800"], display: "swap", variable: "--font-mulish" });
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400","500","600","700","800","900"],
  display: "swap",
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: { default: "SH Enterprises — Craft & Tailoring Supplies in Sri Lanka", template: "%s | SH Enterprises" },
  description:
    "Buy quality threads, zippers, scissors, elastics, ribbons, buttons and more craft & tailoring supplies online. Island-wide delivery across Sri Lanka. Cash on delivery available.",
  keywords: ["threads", "zippers", "buttons", "elastics", "ribbons", "scissors", "tailoring supplies", "craft supplies", "Sri Lanka", "Colombo"],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
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

  const lang = getServerLang();

  return (
    <html lang={lang} className={`${lora.variable} ${mulish.variable} ${fraunces.variable}`}>
      <body>
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
            <SignupNudge />
          </Suspense>
        </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
