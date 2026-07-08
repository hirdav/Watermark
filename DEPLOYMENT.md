# Deployment Log — Watermark Proofing SaaS on Railway

Status as of 2026-07-07/08: **live in production** at `https://watermark.edantra.online`.

## What was done

### 1. Code changes (SQLite → Postgres)
- Installed `@prisma/adapter-pg` + `pg`, removed `@prisma/adapter-better-sqlite3`.
- `prisma/schema.prisma`: datasource provider switched from `sqlite` to `postgresql`.
- `lib/db.ts`: swapped `PrismaBetterSqlite3` adapter for `PrismaPg({ connectionString: process.env.DATABASE_URL })`.
- Deleted the old SQLite-provider migration history (no prod data existed yet) and generated a fresh initial migration for Postgres offline via `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` (no live DB connection needed to produce it).
- Added a `postinstall: prisma generate` script — Railway's build doesn't run this on its own, and the generated client is gitignored, so the first build failed with a module-not-found error until this was added.
- Changed `npm start` to `prisma migrate deploy && next start` — migrations now apply automatically on every container boot (idempotent, safe to run every time).
- Updated `README.md` and `.env.example` to reflect Postgres-only local dev (no more SQLite instructions).

### 2. Railway infrastructure
Project **`watermark`** (workspace: Hirak Jyoti Kalita's Projects), environment `production`:

| Service | Purpose | Notes |
|---|---|---|
| `Postgres` | Database | Official `postgres-ssl:18` template, 500 MB volume at `/var/lib/postgresql/data` |
| `watermark-app` | Next.js app | Deployed from `hirdav/Watermark@master` (Railpack builder), 500 MB volume mounted at `/data` |

Build command: `npm run build` · Start command: `npm run start` (via package.json, includes the migration step above).

### 3. Environment variables (set on `watermark-app`)
- `DATABASE_URL` — reference variable to the Postgres service (`${{Postgres.DATABASE_URL}}`)
- `AUTH_SECRET` — freshly generated for prod (not reused from local `.env`)
- `STORAGE_DIR` = `/data/storage`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — test mode keys
- `RAZORPAY_PLAN_ID_PRO`, `RAZORPAY_PLAN_ID_STUDIO` — confirmed as distinct plan IDs (an earlier `.env` had them duplicated; fixed before deploy)
- `RAZORPAY_WEBHOOK_SECRET` — still blank, pending webhook registration (see Outstanding below)

### 4. Database migration
`prisma migrate deploy` ran successfully on first container boot — confirmed via deploy logs: migration `20260707200000_init` applied, all tables created, Next.js came up listening on port 8080.

### 5. Custom domain — `watermark.edantra.online`
This took a few iterations:
- Railway's MCP agent initially added the domain via a raw config patch, which skipped Railway's actual domain-verification flow — no TXT record was generated, so it never routed properly (404 / cert mismatch).
- Fixed by adding the custom domain through Railway's dashboard UI directly (Settings → Networking → Custom Domain), which produced the correct pair of DNS records:
  - `CNAME` — host `watermark`, target `hnu1zmg5.up.railway.app`
  - `TXT` — host `_railway-verify.watermark`, value `railway-verify=daa5d571c8c4589292f03aefe18ca5908a2e5014700d771472a294e616c03716`
- Hostinger DNS Zone Editor also had a leftover record from the old placeholder subdomain hosting feature that conflicted with the new CNAME — had to be removed first.
- Both records added and propagated; Railway issued the Let's Encrypt certificate; verified via `curl` with a full TLS handshake (HTTP 200, valid cert matching the hostname).
- Volume size was also reduced from an initial 1024 MB to 500 MB after Railway's dashboard flagged it as exceeding the current plan's per-volume limit.

## Outstanding

1. **Razorpay webhook** — not yet registered. Once ready:
   - Add webhook in Razorpay Dashboard → Settings → Webhooks: URL `https://watermark.edantra.online/api/billing/webhook`, events `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.halted`.
   - Paste the resulting webhook secret back so `RAZORPAY_WEBHOOK_SECRET` can be set on Railway.
2. **End-to-end billing verification** — checkout call structure and webhook signature verification were validated in the original MVP build session; a real Razorpay test-mode charge through the deployed app hasn't been exercised yet.
3. If the user still sees "Not Secure" in-browser after DNS/cert fixes, it's most likely local/browser DNS caching (old CNAME had a 4-hour TTL) — flush DNS / try incognito / different network before assuming a real problem.
