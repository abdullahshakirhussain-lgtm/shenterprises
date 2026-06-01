import "./globals.css";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { CartProvider } from "@/components/CartProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { Suspense } from "react";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getSettings(["site_phone", "site_email", "site_address"])
  ]);

  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header categories={categories.map((c) => ({ name: c.name, slug: c.slug }))} />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <main className="min-h-[60vh]">{children}</main>
          <Footer phone={settings.site_phone} email={settings.site_email} address={settings.site_address} />
        </CartProvider>
      </body>
    </html>
  );
}
