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
