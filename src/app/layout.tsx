import "./globals.css";
import type { Metadata } from "next";
import { Lora, Mulish } from "next/font/google";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { CartProvider } from "@/components/CartProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import EasterEggs from "@/components/EasterEggs";
import { Suspense } from "react";

const lora = Lora({ subsets: ["latin"], weight: ["500","600","700"], display: "swap", variable: "--font-lora" });
const mulish = Mulish({ subsets: ["latin"], weight: ["400","500","600","700","800"], display: "swap", variable: "--font-mulish" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: { default: "SH Enterprises — Craft & Tailoring Supplies in Sri Lanka", template: "%s | SH Enterprises" },
  description:
    "Buy quality threads, zippers, scissors, elastics, ribbons, buttons and more craft & tailoring supplies online. Island-wide delivery across Sri Lanka. Cash on delivery available.",
  keywords: ["threads", "zippers", "buttons", "elastics", "ribbons", "scissors", "tailoring supplies", "craft supplies", "Sri Lanka", "Colombo"],
  openGraph: {
    title: "SH Enterprises — Craft & Tailoring Supplies",
    description: "Threads, zippers, scissors, elastics, ribbons, buttons & more. Island-wide delivery in Sri Lanka.",
    type: "website",
    locale: "en_LK"
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

  return (
    <html lang="en" className={`${lora.variable} ${mulish.variable}`}>
      <body>
        <LanguageProvider>
        <CartProvider>
          <Header categories={categories.map((c) => ({ name: c.name, slug: c.slug }))} />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <main className="min-h-[60vh]">{children}</main>
          <Footer phone={settings.site_phone} email={settings.site_email} address={settings.site_address} />
          <EasterEggs />
        </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
