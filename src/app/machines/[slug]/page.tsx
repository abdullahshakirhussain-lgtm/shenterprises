import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/userAuth";
import { safeJsonLd } from "@/components/JsonLd";
import MachineContactButtons from "@/components/MachineContactButtons";
import MachineGallery from "@/components/MachineGallery";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

function parseImages(v: string | null): string[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter(Boolean) : []; } catch { return []; }
}
function parseSpecs(v: string | null): { key: string; value: string }[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}
function parseEquivalents(v: string | null): { brand: string; model: string; note?: string }[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}
function parseFaq(v: string | null): { q: string; a: string }[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const m = await prisma.machine.findUnique({ where: { slug: params.slug } });
  if (!m) return { title: "Machine not found" };
  const equivs = parseEquivalents(m.equivalents);
  // Weave the top equivalent into the title so competitor-brand searches match.
  const topEquiv = equivs[0] ? ` (= ${equivs[0].brand} ${equivs[0].model})` : "";
  const title = `${m.brand} ${m.modelNumber} Industrial Sewing Machine${topEquiv} Price Sri Lanka`;
  const equivList = equivs.slice(0, 3).map(e => `${e.brand} ${e.model}`).join(", ");
  const desc = (
    m.seoIntro ||
    `${m.brand} ${m.modelNumber} ${m.name} — industrial sewing machine in Sri Lanka from SH Enterprises.` +
    (equivList ? ` Equivalent to ${equivList}.` : "") +
    ` Authorized dealer, warranty & island-wide service.`
  ).slice(0, 158);
  return {
    title,
    description: desc,
    keywords: [
      `${m.brand} ${m.modelNumber}`,
      ...equivs.map(e => `${e.brand} ${e.model}`),
      "industrial sewing machine Sri Lanka",
      m.category || "",
    ].filter(Boolean),
    openGraph: {
      title: `${title} | SH Enterprises`,
      description: desc,
      type: "website",
      images: m.imageUrl ? [m.imageUrl] : undefined,
    },
  };
}

export default async function MachinePage({ params }: { params: { slug: string } }) {
  const m = await prisma.machine.findUnique({ where: { slug: params.slug } });
  if (!m || !m.active) notFound();

  const [sitePhoneRaw, siteUrl] = [await getSetting("site_phone"), process.env.SITE_URL || "https://shenterprises.lk"];
  const phone = normalizePhone(sitePhoneRaw || "") || "";
  const gallery = [m.imageUrl, ...parseImages(m.images)].filter(Boolean) as string[];
  const specs = parseSpecs(m.specs);
  const equivalents = parseEquivalents(m.equivalents);
  const faq = parseFaq(m.faq);

  // JSON-LD Product — brand + model + offer + equivalents as additionalProperty
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${m.brand} ${m.modelNumber} ${m.name}`,
    sku: m.modelNumber,
    mpn: m.modelNumber,
    brand: { "@type": "Brand", name: m.brand },
    ...(m.imageUrl ? { image: gallery } : {}),
    ...((m.seoIntro || m.description) ? { description: m.seoIntro || m.description } : {}),
    category: m.category || "Industrial Sewing Machine",
    ...(equivalents.length ? {
      additionalProperty: equivalents.map(e => ({
        "@type": "PropertyValue",
        name: "Equivalent model",
        value: `${e.brand} ${e.model}`,
      })),
    } : {}),
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/machines/${m.slug}`,
      priceCurrency: "LKR",
      ...(m.price != null ? { price: m.price.toFixed(2) } : {}),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "SH Enterprises" },
    },
  };

  // Breadcrumb + optional FAQ structured data
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Machines", item: `${siteUrl}/machines` },
      { "@type": "ListItem", position: 3, name: `${m.brand} ${m.modelNumber}`, item: `${siteUrl}/machines/${m.slug}` },
    ],
  };
  const faqLd = faq.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <div className="bg-ink text-cream min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />}

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/machines" className="text-sm text-cream/60 hover:text-cream">← All machines</Link>
      </div>

      {/* SEO intro lead — keyword-rich, natural */}
      {m.seoIntro && (
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <p className="text-cream/70 leading-relaxed max-w-3xl">{m.seoIntro}</p>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 pb-16 grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <MachineGallery images={gallery} alt={`${m.brand} ${m.modelNumber}`} />

        {/* Info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-400">{m.brand}</p>
          <h1 className="font-display font-semibold text-3xl sm:text-4xl mt-1 leading-tight">
            {m.name}
          </h1>
          <p className="mt-2 inline-block rounded-lg bg-white/10 border border-white/15 px-3 py-1 text-sm font-mono tracking-wide">
            Model: <strong>{m.modelNumber}</strong>
          </p>
          {m.category && <p className="text-cream/60 text-sm mt-2">{m.category}</p>}

          <p className="mt-5 text-2xl font-semibold text-saffron-300">
            {m.price != null ? formatLKR(m.price) : "Enquire for price"}
          </p>

          {/* Contact CTAs — NO cart */}
          <div className="mt-6">
            <MachineContactButtons
              phone={phone}
              brand={m.brand}
              modelNumber={m.modelNumber}
              machineId={m.id}
              machineName={m.name}
            />
            <p className="text-xs text-cream/50 mt-2 text-center sm:text-left">
              WhatsApp opens with the model number pre-filled. We&apos;ll share price, availability &amp; a demo video.
            </p>
          </div>

          {/* Trust block */}
          <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-saffron-300">
              <span>✓</span> Authorized {m.brand} dealer
            </p>
            <p className="flex items-center gap-2 text-sm text-cream/80"><span className="text-saffron-400">✓</span> Warranty included</p>
            <p className="flex items-center gap-2 text-sm text-cream/80"><span className="text-saffron-400">✓</span> Island-wide after-sales &amp; service</p>
            {m.warrantyInfo && <p className="text-xs text-cream/60 pt-1 border-t border-white/10 mt-2">{m.warrantyInfo}</p>}
          </div>

          {/* Cross-brand equivalents — real buyer cross-reference + SEO */}
          {equivalents.length > 0 && (
            <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-5">
              <h2 className="text-sm font-bold uppercase tracking-[.15em] text-saffron-400 mb-1">Also known as / Equivalent to</h2>
              <p className="text-xs text-cream/50 mb-3">
                The {m.brand} {m.modelNumber} is the direct equivalent of these machines from other brands. If you use one of these, this is your replacement.
              </p>
              <ul className="space-y-1.5">
                {equivalents.map((e, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="text-saffron-400">↔</span>
                    <span className="font-medium">{e.brand} {e.model}</span>
                    {e.note && <span className="text-cream/50 text-xs">— {e.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Spec table + description */}
      <div className="mx-auto max-w-6xl px-4 pb-20 grid md:grid-cols-2 gap-8">
        {specs.length > 0 && (
          <div>
            <h2 className="font-display font-semibold text-2xl mb-4">Specifications</h2>
            <table className="w-full text-sm">
              <tbody>
                {specs.map((s, i) => (
                  <tr key={i} className="border-b border-white/10">
                    <td className="py-2.5 pr-4 text-cream/60 align-top w-2/5">{s.key}</td>
                    <td className="py-2.5 font-medium">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {m.description && (
          <div>
            <h2 className="font-display font-semibold text-2xl mb-4">About this machine</h2>
            <p className="text-cream/80 whitespace-pre-line leading-relaxed">{m.description}</p>
          </div>
        )}
      </div>

      {/* FAQ — visible + FAQPage rich snippet */}
      {faq.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 pb-24">
          <h2 className="font-display font-semibold text-2xl mb-5">Frequently asked questions</h2>
          <div className="space-y-4">
            {faq.map((f, i) => (
              <details key={i} className="rounded-xl bg-white/5 border border-white/10 p-4 group">
                <summary className="font-medium cursor-pointer list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-saffron-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-cream/70 text-sm mt-3 leading-relaxed whitespace-pre-line">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
