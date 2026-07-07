# SH Enterprises

E-commerce site for craft & tailoring supplies (threads, zippers, scissors, elastics, ribbons, buttons, etc.) with admin panel, COD + bank deposit checkout, Koombiyo delivery integration, and analytics.

## Quick start

```bash
npm install
npm run db:push     # creates SQLite db (already done if you ran setup)
npm run db:seed     # seeds districts, cities, categories, admin user
npm run dev         # http://localhost:3000
```

Visit:
- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin (default: `admin` / `admin123` — change on first login via Settings → not yet, you can change password by re-running seed with new ADMIN_PASSWORD env)

## Configuration

Edit `.env`:
- `DATABASE_URL` — defaults to local SQLite
- `AUTH_SECRET` — change to a long random string for production
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — used on first seed
- `SITE_URL` — used for SEO sitemap, canonical URLs

Other settings (bank account, Koombiyo API key, DeepSeek API key, contact info, free-delivery threshold) are editable in **Admin → Settings**.

## Features

- Product catalog with categories, search, offers
- Cart (client-side) with abandoned-cart tracking
- Checkout with district/city dropdowns → live delivery fee
- Two payment methods: Cash on Delivery + Bank deposit (with slip upload)
- Admin: dashboard, products CRUD, image upload, CSV import (with optional DeepSeek extraction), categories, orders, customers, analytics, delivery rate editor, settings
- SEO: SSR pages, per-page metadata, JSON-LD Product schema, sitemap.xml, robots.txt
- Analytics: sessions, page views, time-on-site (heartbeat pings), traffic source, cart events, abandoned carts, top products
- Koombiyo API integration (falls back to per-district rate)

## Tech

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · Prisma + SQLite · jose (JWT) · bcryptjs.

## Meta Pixel + Conversions API

The site sends conversion events to Meta **twice** — once from the browser Pixel
and once from the server (Conversions API) — sharing one `event_id` so Meta
deduplicates and counts each event once with the best signal.

### Events

| Event | Where it fires |
|---|---|
| `PageView` | every page + SPA navigation |
| `ViewContent` | product page open (+ the Quick Catalog page) |
| `AddToCart` | main-site cart add |
| `InitiateCheckout` | checkout page open |
| `Purchase` | order completed on-site (COD / bank) — buyer phone+name hashed server-side |
| `Lead` (ContactWhatsApp) | WhatsApp click-outs (floating button + catalog "Share on WhatsApp") |

Most orders close over WhatsApp, so `Lead`/ContactWhatsApp is the key intent
signal. The real WhatsApp `Purchase` will be sent later from a WhatsApp Cloud
API webhook using `sendMetaEvent({ action_source: "business_messaging", ... })`
— see the commented example at the bottom of `src/lib/metaEvents.ts`.

### Setup (Railway env vars)

1. Meta Events Manager -> your dataset -> copy the **Pixel ID** -> set
   `NEXT_PUBLIC_META_PIXEL_ID`.
2. Events Manager -> Settings -> Conversions API -> **Generate access token** ->
   set `META_CAPI_ACCESS_TOKEN` (server-only, never `NEXT_PUBLIC`).
3. (Optional) `META_GRAPH_API_VERSION` defaults to `v21.0`.

Leave the vars empty and nothing loads — the site runs Meta-free.

### Validate

- **Test Events:** Events Manager -> Test Events -> copy the `TESTxxxxx` code ->
  set `META_TEST_EVENT_CODE` on Railway -> browse the site. Both **Browser** and
  **Server** rows should appear, and matching pairs show as **Deduplicated**.
  Clear the code when done.
- **Meta Pixel Helper** (Chrome extension): shows `PageView` / `ViewContent`
  firing once each, no duplicates.
- **No raw PII:** in DevTools -> Network, the `/api/meta/event` request body may
  contain phone/name (first-party, HTTPS) but the outbound Graph API call hashes
  them; nothing raw reaches Meta. The CAPI token never appears in the client bundle.

### Product IDs

`content_ids` use `src/lib/contentId.ts` -> `sku` when set, else `SHE-{id}`.
Use the same scheme for a future Meta Catalog / Google Merchant feed so dynamic
ads and Shopping listings match without ID drift.

## Machines (industrial sewing machines — Prime)

Machines are a **separate model** from products — no cart, no checkout. Ordering
is **Call + WhatsApp only**. Manage them all from the dashboard.

### Add a machine
1. Admin → **Machines** → **+ Add machine**
2. Fill in:
   - **Model number** (required) — the SEO anchor (e.g. `JK-8720`). The slug
     becomes `prime-jk-8720`.
   - **Name**, optional **Category**
   - **Price** — leave empty to show "Enquire for price"
   - **Description**
   - **Specifications** — repeatable key/value rows (Max speed → 5000 spm, etc.)
   - **Warranty / trust info**
   - **Main image** + **Gallery images**
   - **Active** toggle
3. Save. The machine appears at `/machines` and `/machines/prime-<model>`.

### What each machine page does
- Premium dark template, distinct from the accessory catalog.
- Model number is prominent + baked into the `<title>`, meta, H1, and JSON-LD.
- Spec table, trust block (authorized dealer + warranty + island-wide service).
- **Call** button (`tel:`) and **WhatsApp** button pre-filled with the model
  number ("Hi, I'm interested in the Prime <model>…") so you know which machine.
- WhatsApp clicks fire the same ContactWhatsApp/Lead pixel + analytics
  `whatsapp_click` log as the rest of the site, tagged with the model number.
- `/machines/*` pages are in the sitemap automatically.
