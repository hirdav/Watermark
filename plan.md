# Watermark Proofing SaaS — MVP Build (with Razorpay billing)

## Context
`D:\CODE\Watermark` currently contains a single script (`watermark.js`) that embeds a subtle, forensic diagonal text watermark into local image files using `sharp`. Following customer discovery, the target product is a proofing-gallery SaaS for photographers: upload a shoot, get an invisible-watermark preview gallery to share with clients, protect proofs from theft pre-purchase, and monetize via subscription tiers. This build turns the script into that product end-to-end, including billing, in this repo (already a git repo, currently empty besides the script).

**Decisions locked in from discussion:**
- Full MVP scope this session: accounts, shoots, watermarking, shareable client galleries, plan limits, and Razorpay subscription billing.
- Storage: local disk (Railway persistent volume in prod), not cloud object storage yet.
- Stack: Next.js (App Router) + TypeScript + Tailwind.
- No queue/worker yet (single Node process processes images synchronously on upload) — that's a later scaling phase.

**Two implementation calls made to keep this buildable without extra external setup right now (flagging both explicitly):**
- **Local dev DB = SQLite** (zero setup, no Docker/Railway CLI available in this environment). Prisma schema provider switches to `postgresql` as a one-line change at deploy time to Railway — trivial since there's no production data yet.
- **Razorpay Plan IDs must be created manually** in the Razorpay dashboard (test mode) — this can't be scripted from here. The webhook also needs a public URL to actually receive events, so full billing verification (a real subscription charge) only completes once deployed or tunneled; locally we can verify the checkout call is created correctly and the webhook handler's signature verification logic works via a manual test payload.

## Data Model (`prisma/schema.prisma`)
- `User`: id, email, passwordHash, name, plan (enum FREE/PRO/STUDIO), razorpayCustomerId, relations to shoots + subscription
- `Subscription`: userId (unique), razorpaySubscriptionId, status, plan, currentPeriodEnd
- `Shoot`: id, userId, title, shareToken (unique, public URL slug), watermarkText (default), relation to images
- `Image`: id, shootId, originalPath, watermarkedPath, filename, selected (client favorite flag)

## Core watermark engine — `lib/watermark.ts`
Port `buildDiagonalOverlaySVG` and `applyWatermark` from `watermark.js` verbatim (the tiling math, rotation, opacity are already correct/proven) but change the function signature to be pure and reusable:
```ts
applyWatermark(input: Buffer, opts?: { text?: string }): Promise<{ buffer: Buffer; format: 'jpeg' | 'png' }>
```
No filesystem access inside this module — callers (the upload API route) handle reading the original and writing the result. `text` defaults to a configurable constant (replacing the hardcoded `"TLA"`), so Pro/Studio plans can pass their own watermark text later.

## File/route structure
```
lib/watermark.ts        core engine (above)
lib/db.ts                Prisma client singleton
lib/auth.ts              Auth.js (NextAuth) config, Credentials provider, bcrypt
lib/plans.ts             plan limits: FREE/PRO/STUDIO quotas + Razorpay plan id mapping
lib/storage.ts           local-disk read/write helpers, base path from STORAGE_DIR env
lib/razorpay.ts          Razorpay SDK client + webhook signature verification helper

app/(auth)/login/page.tsx
app/(auth)/signup/page.tsx
app/dashboard/page.tsx                    list/create shoots
app/dashboard/shoots/[id]/page.tsx        upload UI, image grid, share link, download-all
app/gallery/[token]/page.tsx              public client-facing gallery (no auth)
app/pricing/page.tsx                      plan comparison + Razorpay checkout button

app/api/auth/[...nextauth]/route.ts
app/api/shoots/route.ts                   POST create, GET list (auth required)
app/api/shoots/[id]/upload/route.ts       multipart upload -> watermark -> disk -> Image rows; enforces plan limits
app/api/shoots/[id]/download/route.ts     streams a zip (via `archiver`) of watermarked images
app/api/gallery/[token]/route.ts          public GET: shoot + watermarked images only
app/api/gallery/[token]/select/route.ts   public POST: toggle a client favorite
app/api/billing/checkout/route.ts         POST: creates a Razorpay subscription, returns params for Checkout.js
app/api/billing/webhook/route.ts          POST: verifies x-razorpay-signature, updates Subscription/User.plan
```

## Plan limits (`lib/plans.ts`)
- FREE: 1 active shoot, 20 images/month, fixed default watermark text, no billing needed
- PRO: unlimited shoots, 500 images/month, custom watermark text
- STUDIO: unlimited shoots, unlimited images, custom watermark text
Enforced in the upload route by counting `Image` rows created since the start of the current billing period for that user, across all their shoots.

## Auth
Auth.js v5 with a Credentials provider (email + bcrypt password hash), JWT session strategy — no separate session table needed. Middleware protects `/dashboard/*`; `/gallery/[token]` stays public (the token itself is the access control).

## Razorpay billing
- Checkout: `app/api/billing/checkout` calls `razorpay.subscriptions.create` with the plan's Razorpay `plan_id` (from env), returns `subscription_id` to the client, which opens Razorpay's Checkout.js widget in subscription mode.
- Webhook: verifies `x-razorpay-signature` via HMAC (raw body + `RAZORPAY_WEBHOOK_SECRET`), handles `subscription.activated` / `subscription.charged` / `subscription.cancelled` / `subscription.halted` to update `Subscription.status` and `User.plan`.
- Required manual setup (documented in README, done by you): Razorpay account, test-mode Key ID/Secret, two Plans created in the dashboard (Pro, Studio) → their plan IDs go into `.env`.

## Storage
`STORAGE_DIR` env var (default `./storage`, gitignored). Layout: `${STORAGE_DIR}/{userId}/{shootId}/original/...` and `.../watermarked/...`. On Railway this path becomes a mounted persistent volume — no code change needed, just a deploy-time volume mount.

## Build order
1. `create-next-app` (TS, Tailwind, App Router, ESLint)
2. Install deps: `prisma @prisma/client sharp next-auth bcryptjs razorpay archiver nanoid`
3. Prisma schema + SQLite dev DB + first migration
4. `lib/watermark.ts` — port and adapt the engine
5. Auth: signup/login pages, NextAuth config, middleware
6. Dashboard: create/list shoots
7. Shoot detail: upload route (watermark + persist), image grid, share link, zip download
8. Public gallery page + favorite-select API
9. Plan-limit enforcement wired into the upload route
10. Pricing page + Razorpay checkout + webhook route
11. `.env.example` + README covering local setup and the manual Razorpay dashboard steps
12. Verification pass

## Verification
- `npm run dev`, use preview tools to: sign up a test user, create a shoot, upload a generated test image (synthesized via sharp since no sample photos exist in this repo yet) and confirm a visibly-different (watermarked) file is produced and downloadable.
- Open the public `/gallery/[token]` link and confirm it renders only watermarked images and the favorite-toggle works.
- Exceed the Free tier's 20-image limit and confirm the upload route rejects further uploads with a clear error.
- Confirm `/api/billing/checkout` returns a valid Razorpay subscription payload structure (won't complete a real charge without live keys — that's a manual step once you add Razorpay test credentials).
- Confirm the webhook route correctly rejects a request with a bad/missing signature and accepts one with a validly-computed test signature.



contine with this - Here's the refreshed brief — paste into the other session:

---

**Deploy the Watermark app (D:\CODE\Watermark) to Railway**

**Current state:** Next.js 16 (App Router/TS/Tailwind) app, Prisma 7 ORM. Locally it uses SQLite via `@prisma/adapter-better-sqlite3` (see `lib/db.ts`) and local-disk image storage (`STORAGE_DIR` env var, default `./storage`). Nothing is deployed anywhere yet. Target: Railway with Postgres + a persistent volume, exposed at custom domain `watermark.edantra.online` (currently a Hostinger-hosted placeholder that needs its DNS repointed).

**1. Code changes needed first:**
- Install `@prisma/adapter-pg` (`npm install @prisma/adapter-pg pg`)
- In `prisma/schema.prisma`, change `datasource db { provider = "sqlite" }` → `provider = "postgresql"`
- In `lib/db.ts`, swap `PrismaBetterSqlite3` for the pg adapter, e.g. `new PrismaPg({ connectionString: process.env.DATABASE_URL })` — reference the existing file for the current pattern

**2. Provision on Railway (via the Railway MCP):**
- New project, add a Postgres addon
- Add a persistent volume, mount it at `/data`
- Deploy this repo (`D:\CODE\Watermark`) as a service — build command `npm run build`, start command `npm run start`

**3. Environment variables to set on the Railway service:**
- `DATABASE_URL` — from the provisioned Postgres addon (Railway provides this automatically as a reference variable)
- `AUTH_SECRET` — generate a **new** one for prod, don't reuse the local dev value (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- `STORAGE_DIR` = `/data/storage`
- `RAZORPAY_KEY_ID` = `rzp_test_TAj06BCWgA7LSr`
- `RAZORPAY_KEY_SECRET` = `EmlUxPCVYr5U6wLdl9oeCdo7`
- `RAZORPAY_WEBHOOK_SECRET` — leave blank for now, fill in after creating the webhook in step 5
- `RAZORPAY_PLAN_ID_PRO` = `plan_TAj3sNmoUjNSUq`
- `RAZORPAY_PLAN_ID_STUDIO` — **check this before setting it.** As of now it's still the same value as Pro (`plan_TAj3sNmoUjNSUq`) in the local `.env` — confirm a distinct Studio plan (₹2999/mo) has been created in Razorpay Dashboard → Subscriptions → Plans and use *that* plan's own `plan_id` here, not a duplicate of Pro's.

**4. Run the DB migration** against the new Postgres instance once it's up: `npx prisma migrate deploy`.

**5. Domain:**
- Add `watermark.edantra.online` as a custom domain on the Railway service — Railway will give you a CNAME target
- In Hostinger: go to the DNS Zone Editor for `edantra.online` (not the "Subdomains" hosting feature used earlier, which serves static files from `public_html` — wrong mechanism here) and point the `watermark` CNAME record at Railway's target
- Once DNS propagates, verify `https://watermark.edantra.online` loads the actual app, not the Hostinger placeholder

**6. After it's live**, register the Razorpay webhook at `https://watermark.edantra.online/api/billing/webhook` (no angle brackets), subscribed to `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.halted` — copy the resulting webhook secret into `RAZORPAY_WEBHOOK_SECRET` on Railway.

---

## 2026-07-08 — Where things stand, and the product pivot in progress

### Deployed and working
The app went live at `https://watermark.edantra.online` on Railway (Postgres + persistent volume, custom domain, cert issued). Two production bugs found and fixed after launch, both the same underlying class of issue — code trusting `req.url` / needing to trust Railway's reverse-proxy headers:
- **Login broke in prod** (`UntrustedHost` from Auth.js) — fixed by adding `trustHost: true` to `lib/auth.config.ts`.
- **Post-upload/post-favorite redirects sent the browser to `localhost:8080`** instead of the real domain — `req.url` resolved to the container's internal host behind Railway's proxy. Fixed in `app/api/shoots/[id]/upload/route.ts` and `app/api/gallery/[token]/select/route.ts` by issuing a **relative** `Location` header instead of `new URL(path, req.url)`, so the browser resolves it against its own current origin instead of trusting the server's view of the host.

Razorpay checkout/webhook wiring, plan quotas, and the shoot/gallery/favorite-select loop were all confirmed working in prod (a real checkout call and webhook delivery were observed in Railway logs).

### The pivot: why we're rebuilding the watermark step
The original MVP watermarked every photo with a fixed, near-invisible, tiled diagonal forensic mark — good for theft *detection*, not for what a working photographer actually needs. Reframing (2026-07-08 discussion):

> A photographer doesn't watermark for fun. They watermark to send previews before payment. So the killer workflow isn't "upload, stamp, download." It's "upload a batch, auto-watermark, get a shareable gallery link, client selects, you deliver clean files after payment." The watermark is a feature; **the proofing loop is the product.**

Decisions locked in:
- **Keep**: accounts, Razorpay billing/plan tiers, the `Shoot` model, and the public gallery/favorite-select loop — that loop *is* the product, don't touch it.
- **Replace**: the fixed tiled-text engine with a configurable single-stamp watermark — photographer picks **text or a transparent PNG logo**, then sets **position (9-grid), size, opacity, rotation, margin from edge**. FREE stays locked to a default; PRO/STUDIO unlock full customization (reusing the existing plan-gate boolean, renamed `customWatermarkText` → `customWatermark`).
- **Add**: a "download client-selected photos as originals" route — this is the missing half of "deliver clean files after payment" (previously the only download option zipped *all* photos at *watermarked* quality; there was no way to hand over clean files for just the favorites).
- **Deferred on purpose**: video watermarking (needs an ffmpeg pipeline — phase 2) and Google Drive export (needs OAuth consent screen + Google verification — separate follow-up). Images + local zip download only, for now.

Full design detail (sharp compositing pipeline, gravity mapping, opacity/margin technique, data model, route list) lives in the Claude plan file used to build this: `C:\Users\HWealth\.claude\plans\sequential-singing-penguin.md`.

### Status of the pivot as of now
Implemented, not yet committed or deployed:
- `prisma/schema.prisma` — `Shoot` gained `watermarkType`, `watermarkLogoPath`, `watermarkPosition`, `watermarkSizePct`, `watermarkOpacity`, `watermarkRotation`, `watermarkMarginPct` (+ two new enums). Migration written by diffing the schema file directly (no local Postgres available to generate it live) — will apply automatically via the existing `prisma migrate deploy && next start` boot step on next deploy.
- `lib/watermark.ts` — fully rewritten: sharp `gravity` for the 9 positions, raw-buffer alpha scaling for logo opacity, `rotate()` with transparent background, `extend()` padding for margin.
- New routes: `watermark-config` (save settings + optional logo upload), `watermark-preview` (in-memory render for a live preview, no persistence), `download-selected` (zips originals of only client-favorited photos).
- `upload/route.ts` now builds the watermark from the shoot's saved config instead of a hardcoded text string.
- New `WatermarkSettings` client component (the app's first — needed for the live-updating preview as sliders move) wired into the shoot detail page, plus a second download button.
- Verified: `tsc --noEmit`, `npm run lint`, and `npm run build` all pass. The engine itself was verified visually against synthetic test images (all 9-position/opacity/rotation/margin combinations render correctly).
- **Not yet verified**: clicking through the actual browser flow (login → configure watermark → upload → client favorites → download-selected). Local `.env` has a stale SQLite-style `DATABASE_URL` left over from before the Postgres migration, and there's no local Postgres/docker in this environment — so `npm run dev` can't be exercised end-to-end locally right now. Needs either a local Postgres pointed at, or a manual click-through after deploying.

### Next steps
1. ~~Get a local Postgres reachable (or accept testing only after deploy) and click through the full flow once.~~ Done via prod (2026-07-08, see below).
2. ~~Commit and deploy; confirm the migration applies cleanly on Railway boot.~~ Done — `20260708100514_add_watermark_config` applied cleanly on boot.
3. Partially done — text watermark verified end-to-end in prod on a real Pro account; **logo watermark not yet exercised in prod** (engine verified locally only).
4. Phase 2 (later): video watermarking via ffmpeg; Google Drive export via OAuth.

## 2026-07-08 (later) — Pivot deployed and verified in prod

Deployed the watermark-pivot commit; migration applied automatically on Railway boot. Verified in production:
- **FREE tier**: signup → shoot → upload → default centered "PROOF" stamp renders in the public gallery; favorite-toggle works; `download-selected` returns a zip containing the **clean original** (byte-uniform check confirmed no stamp). `watermark-config`/`watermark-preview` correctly reject FREE users (400/403).
- **PRO tier** (real Razorpay test checkout by the owner on `test@testing.com`; webhook flipped the plan): custom text config saves, live preview renders, uploads stamp per config (position/size/opacity/margin all honored).

Two production bugs found and fixed in the process:
- **No fonts in the Railway runtime image** — SVG text watermarks rendered as tofu boxes (□□□□), and the very first Pro upload produced a *completely unstamped* file (transient empty pango layout — the no-fonts code path is flaky, not just ugly). Fix: `railpack.json` with `deploy.aptPackages: ["fonts-dejavu-core", "fontconfig"]` + DejaVu Sans named first in the SVG font stack.
- **Long watermark text clipped** — the stamp SVG was exactly `stampWidth` wide while the text at `0.18 × stampWidth` overflowed ("HIRAK STUDIO" → "HIRAK ST"). Fix: cap font size to fit the string width (`stampWidth / (len × 0.65)`).

Still to verify manually when convenient: a **logo (PNG) watermark** in prod on the Pro account — the engine path is covered by local tests but hasn't been clicked through in production. Note: one orphaned unstamped image exists in prod test data (shoot "Pro Watermark Test", first upload, pre-font-fix) — harmless test data.

## 2026-07-08 (evening) — Guided wizard UX, templates, tiled + custom placement

Complete UX rebuild of the shoot page (commit `2b7eba7`), deployed and verified in prod via the Railway-generated domain:

- **Guided 4-step wizard** replaces the all-options-at-once page: ① choose watermark (text / PNG logo / saved template) → ② customize (size, position, opacity, rotation, margin) with debounced live preview → ③ drag-and-drop batch upload → ④ results grid with per-image download + ZIP. Progressive disclosure; steps navigable via a stepper. FREE plan gets a locked step ① with a "continue with default" path.
- **Watermark templates**: new `WatermarkTemplate` model + `GET/POST /api/watermark-templates`, `DELETE /api/watermark-templates/[id]`. Save current settings as a named template (logo file copied to `{userId}/templates/{id}.png`); pick a template in step ① to prefill everything. Plan-gated like custom watermarks (GET open, POST 403 on FREE — verified).
- **Placement modes**: `watermarkMode` SINGLE/TILED + `CUSTOM` position with `watermarkPosXPct/YPct`. Tiled = sharp `tile: true` compositing with margin-controlled spacing (presets in UI: "Diagonal pattern" = tiled −30°, "Repeat grid" = tiled 0°); CUSTOM = click-to-place on the live preview. Plus a stamp-fit clamp (`fitWithin`) so oversized/rotated stamps can't exceed base-image dims.
- Migration `20260708120000_add_watermark_mode_and_templates` applied cleanly on Railway boot.
- **Prod verification (all pass)**: tiled text render covers all four quadrants; custom position lands only where placed; logo config via file upload; logo template created from shoot logo (`hasLogo: true`); tiled-logo preview via `templateId`; template delete; FREE gating. (Initial "failure" was a test-harness bug: sharp `.stats()` ignores a preceding `.extract()` — measure quadrants via raw pixel buffers instead.)

**⚠ Open issue — custom domain DNS is down**: `watermark.edantra.online` now returns NXDOMAIN from public resolvers (Cloudflare + Google); the `watermark` CNAME record has disappeared from the Hostinger zone (nameservers still dns-parking.com, apex still resolves). The app is healthy on `https://watermark-app-production-2953.up.railway.app`. Fix: in Hostinger DNS Zone Editor for `edantra.online`, re-add the CNAME `watermark` → the target shown in Railway dashboard → watermark-app service → Settings → Networking (the generated `*.up.railway.app` value). Until then, Razorpay webhooks (registered at the custom domain) will also fail to deliver.

---