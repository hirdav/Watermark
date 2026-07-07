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