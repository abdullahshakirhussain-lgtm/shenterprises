# Local audit fixes — 25 September 2026

All changes are uncommitted and undeployed. No production database, order,
original image or existing bank-slip object was changed by this work.

## Changes

- Separate administrator/customer token audiences, signed OTP registration
  proof, secure OTP generation, bounded request bodies, mutation origin checks,
  and persistent limits on sensitive public endpoints.
- Authoritative checkout quotes, strict local phone validation, transaction-safe
  coupon use and idempotent order creation. Existing variant-price sum semantics
  and configured delivery rules are preserved.
- Durable retry jobs keep SMS, conversion delivery and analytics failures from
  turning a saved order into a failed checkout. Analytics retains only phone
  hashes and last four digits; normal order contact details remain in orders.
- New bank slips use private database storage with owner/admin authorization.
- Consistent available-variant pricing, catalog pagination, stale-search request
  cancellation, cart availability refresh, responsive layouts and image fallback
  handling. Original images are preserved. The header uses a small derivative.
- Clean canonical/structured-data handling, private-page noindex, restricted
  tracking paths and server-owned Purchase events preserve event-id dedup.
- Patched Next.js/React dependencies and async request API compatibility,
  explicit per-process database pool limits and safe production startup.

## Validation

- 17 regression tests passed.
- Production build, including type/lint checks, passed against synthetic data.
- Production dependency audit: zero reported vulnerabilities.
- Additive migration applied twice to a disposable legacy fixture; historical
  order values remained unchanged.
- Local API checks passed: customer/admin separation, sequential/concurrent
  checkout retries, invalid phone/variant/stock rejection, slip authorization,
  OTP proof isolation and successful order persistence during analytics failure.
- Browser checks passed at 320, 360, 390, 768 and 1024 pixels on six public pages,
  plus cart/checkout and pagination canonical checks. No browser page errors.
  These checks do not certify every device, network or accessibility scenario.
- Tests used localhost PGlite/Postgres-compatible fixtures and blocked external
  browser traffic; no real SMS or external conversion was sent. A real staging
  Postgres smoke test remains appropriate before production deployment.

## Deployment and remaining operational work

1. Review changes and take/verify a database backup before an eventual deployment.
   Run Prisma migrate deploy (already in Railway startup), never db push/reset.
   The migration only adds nullable fields, tables and indexes. Keep those
   additions if rolling application code back; do not drop data-bearing tables.
2. Use Node >=20.9 and npm start so the durable job worker runs alongside Next.
   Budget web connections across all replicas and other database clients. The
   worker uses one connection; this does not guarantee immunity from a shared
   database's connection cap.
3. Existing sessions must sign in again because the token audience/role checks
   intentionally reject the previous unscoped tokens.
4. Older bank slips already stored at public URLs remain an open privacy item.
   Inventory and copy them to private storage, verify access and integrity, then
   revoke old public URLs under a separate reviewed migration. This patch does
   not delete or move them.
5. Supply R2_PUBLIC_URL/IMAGE_REMOTE_HOSTS at build time for remote image
   optimization. Unconfigured hosts retain original-image fallback.
6. SMS delivery is at-least-once: a crash after gateway acceptance can cause a
   repeated message. Verify gateway configuration and monitor retained jobs.
   Long-delayed conversion retries may exceed Meta's acceptance window.
7. Live provider delivery, live search indexing and measured customer-network
   speed gains are not verified by the local fixture tests. No promise of zero
   risk or universal device compatibility is made.
