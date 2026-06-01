# Deploy to Railway

This guide takes ~10 minutes. You'll end up with a public HTTPS URL like
`sh-enterprises-production.up.railway.app` that any computer can reach.

## 1. Push to GitHub

```bash
cd C:\Users\ABDULLAH\Downloads\sh-enterprises
git init
git add .
git commit -m "Initial commit"
```

Create an empty repo on github.com (don't add a README). Then:

```bash
git remote add origin https://github.com/<your-username>/sh-enterprises.git
git branch -M main
git push -u origin main
```

## 2. Create the Railway project

1. Go to https://railway.app and sign in with GitHub.
2. Click **New Project → Deploy from GitHub repo** and pick `sh-enterprises`.
3. Railway will start a first build. It'll fail or restart until we add the
   volume and env vars — that's fine, continue with the next steps.

## 3. Attach a persistent volume (for the SQLite DB + uploads)

In the service, **Settings → Volumes → New volume**:
- **Mount path:** `/app/data`
- **Size:** 1 GB is plenty to start.

## 4. Add environment variables

**Variables** tab → add these (Raw editor is fastest):

```
DATABASE_URL=file:/app/data/prod.db
UPLOAD_DIR=/app/data/uploads
AUTH_SECRET=<paste a long random string here — 32+ chars>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<a strong password>
SITE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
NODE_ENV=production
```

Quick way to generate `AUTH_SECRET` on Windows PowerShell:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | % { [char]$_ })
```

## 5. Expose the port

**Settings → Networking → Generate Domain.** Railway gives you a public URL.

The app listens on `$PORT` automatically (Railway sets it).

## 6. Redeploy

Click **Deploy** (or push another commit). On boot the app will:
1. Apply the Prisma schema to the volume DB
2. Seed districts, categories, admin user (only if the DB is empty)
3. Start Next.js on `$PORT`

Visit your public URL → site loads. Visit `/admin` and log in with the
`ADMIN_USERNAME` / `ADMIN_PASSWORD` you set.

## 7. Configure the live site

In **Admin → Settings** on the live site, set:
- Bank account details
- Koombiyo API key (or use per-district rates)
- DeepSeek API key (optional)
- Contact info shown in the footer
- Member discount %

Then add products via **Admin → Products** or **Admin → Import CSV**.

---

## What persists across redeploys

Anything inside `/app/data` lives on the volume:
- `prod.db` — all your products, orders, customers, reviews, coupons
- `uploads/products/*` — product images
- `uploads/slips/*` — bank deposit slips

The rest of the container is rebuilt each deploy.

## Updating

```bash
git add . && git commit -m "what changed" && git push
```

Railway auto-deploys the new commit. The volume (DB + uploads) is untouched.

## Backups

Railway → Volume → **Download** snapshots the volume to your computer.
Recommended: do this before any risky schema change.

## Costs

Free trial: ~$5 credits. Typical small-store usage runs around $5–8/month after.
