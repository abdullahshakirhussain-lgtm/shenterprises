// Post-deploy warm-up: (1) page + search caches, (2) optimized product images.
//
// (1) The web process keeps catalog data in memory (src/lib/memo.ts), which starts
// empty after a deploy — the first visitor to each page, and the first search,
// would wait on the database. We request them once so shoppers never do.
//
// (2) next/image resizes originals (often ~3MB PNGs) on first request and caches the
// result on the container's disk — which every Railway deploy wipes. Without
// this, the first shopper to view each image waits ~1–2s per photo. We request
// each image once, at the widths browsers actually pick, so shoppers always get
// the cached copy (~0.1s).
import { prisma } from "../src/lib/prisma";

const BASE = `http://127.0.0.1:${process.env.PORT || "3000"}`;
// Listing cards: phones pick 640 (or 360/828), desktops 240/480. Product page
// main image: 828 (phones) and 1080 (desktop retina).
const LISTING_WIDTHS = [640, 480, 240];
const DETAIL_WIDTHS = [828, 1080];
const QUALITY = 75; // next/image default
const ACCEPT = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"; // what Chrome/Safari send
const CONCURRENCY = 2;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function waitForWeb() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + "/robots.txt")).ok) return true; } catch {}
    await sleep(2000);
  }
  return false;
}

function parseImages(json: string | null): string[] {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : []; } catch { return []; }
}

async function main() {
  if (!(await waitForWeb())) return console.warn("[warm-images] web server not reachable; skipped");
  const [products, machines] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { slug: true, imageUrl: true, images: true, variants: { select: { imageUrl: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.machine.findMany({ where: { active: true }, select: { slug: true, imageUrl: true } }),
  ]);
  const [categories, types] = await Promise.all([
    prisma.category.findMany({ select: { slug: true } }),
    prisma.machineType.findMany({ select: { slug: true } }),
  ]);
  await prisma.$disconnect();

  // (1) Pages + search, busiest first. x-forwarded-proto: the middleware
  // otherwise redirects plain-http requests to https.
  const pages = [
    "/", "/shop", "/api/search/suggest?q=th", "/catalog", "/machines", "/offers", "/shop?page=2", "/shop?page=3",
    ...categories.map(c => "/category/" + c.slug),
    ...types.map(t => "/machines/" + t.slug),
    ...products.map(p => "/product/" + p.slug),
    ...machines.map(m => "/machines/" + m.slug),
  ];
  const pagesStarted = Date.now();
  for (const path of pages) {
    await fetch(BASE + path, { headers: { "x-forwarded-proto": "https" } }).then(r => r.arrayBuffer()).catch(() => {});
  }
  console.log(`[warm-up] ${pages.length} pages ready in ${Math.round((Date.now() - pagesStarted) / 1000)}s`);

  const jobs: string[] = [];
  const add = (src: string | null | undefined, widths: number[]) => {
    if (src) for (const w of widths) jobs.push(`${BASE}/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${QUALITY}`);
  };
  // Listing images first (most viewed), then product-page images.
  for (const p of products) add(p.imageUrl, LISTING_WIDTHS);
  for (const m of machines) add(m.imageUrl, LISTING_WIDTHS);
  for (const p of products) {
    add(p.imageUrl, DETAIL_WIDTHS);
    for (const src of parseImages(p.images)) add(src, DETAIL_WIDTHS);
    for (const v of p.variants) add(v.imageUrl, [96]);
  }

  const started = Date.now();
  let done = 0, failed = 0, next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < jobs.length) {
      const url = jobs[next++];
      try {
        const res = await fetch(url, { headers: { accept: ACCEPT } });
        await res.arrayBuffer();
        res.ok ? done++ : failed++;
      } catch { failed++; }
    }
  }));
  console.log(`[warm-images] ${done} images ready, ${failed} failed, in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch(e => console.warn("[warm-images] stopped:", e?.message)).finally(() => process.exit(0));
