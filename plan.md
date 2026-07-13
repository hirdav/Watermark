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

**✔ Resolved — custom domain DNS outage (same day)**: the `watermark` CNAME had disappeared from the Hostinger zone (NXDOMAIN from public resolvers). Re-added in Hostinger DNS Zone Editor as CNAME `watermark` → `watermark-app-production-2953.up.railway.app` (pointing at the service's generated domain works — Railway routes by Host header). Verified after propagation: login, wizard page, templates API, tiled preview, public gallery, and the Razorpay webhook endpoint all pass on `https://watermark.edantra.online`. Lesson: the Railway-generated domain is the stable fallback for verification when the custom domain misbehaves.

---

## 2026-07-09 — Production-ready redesign: marketing site, polished auth, app-wide UX

Full pre-launch polish pass, deployed and verified (commit `b033bea`).

### Marketing landing page
New `(marketing)` route group wraps `/` and `/pricing` (moved via `git mv`, URLs unchanged) with a shared `Header` (sticky, mobile hamburger menu) and `Footer` (Product/Account/Company/Legal columns). Landing page (`app/(marketing)/_sections/*.tsx`): Hero with a CSS/SVG mock gallery card (no fabricated screenshots), How It Works (3 steps mapped to the real wizard), Use Cases (photographers/designers/creators/businesses/agencies), Features grid, Testimonials (clearly comment-marked as placeholder quotes — first name + generic role only, no fake avatars/ratings/counts, to avoid fabricated social proof), FAQ (native `<details>`, no JS needed), final CTA band. Added `/privacy`, `/terms`, `/contact` (contact form sends via the new mail abstraction).

### Auth: forgot/reset password + polish
- `PasswordResetToken` model (hashed token, 1-hour expiry, single-use) + `lib/password-reset.ts`.
- `lib/mail.ts`: SMTP send via `nodemailer` when `SMTP_HOST` is configured; otherwise logs the email (including the reset link) to the server console — documented in `.env.example`, same manual-setup pattern as Razorpay. No SMTP credentials exist for this project yet, so prod currently runs on the console-log fallback.
- `/forgot-password` (always shows the same generic message, whether or not the account exists — no user-enumeration) and `/reset-password/[token]` (invalid/expired token shows a distinct state, not a crash).
- Login/signup rebuilt with shared components: `PasswordField` (show/hide toggle + strength meter), `SubmitButton` (pending spinner via `useFormStatus`), `FormMessage`, `TrustNote` (honest claims only: HTTPS, bcrypt hashing, no data resale — no fabricated certifications or fake review counts).
- New minimal `(auth)` layout (logo + link home, no full nav).

### App-wide UX
Refreshed dashboard layout (Logo, cleaner nav) and dashboard page (card-style shoot list, empty state, `Banner` component for errors/success). Shoot detail page gained a copy-to-clipboard gallery link (`CopyButton`, built from real request headers not `req.url`) and a usage progress bar. Gallery page restyled (favorite ring/badge, hover zoom, empty state). Pricing page redesigned with a "Most popular" badge and checkmarked feature lists. Visual-consistency pass on `ShootWizard.tsx` (rounded-xl, shadows, `Banner` for notices) without touching its working logic/state.

### Verification
- `tsc`, `lint`, `npm run build` all pass.
- Local dev server (no working `DATABASE_URL` in this environment): confirmed the landing page, mobile nav (hamburger opens/closes), password show/hide toggle, signup strength meter, forgot-password page, and FAQ accordion all render/behave correctly — none of these routes touch the DB.
- **Prod, after deploy** (migration `20260709090000_add_password_reset_token` applied cleanly on boot): drove the *full* forgot-password → reset-password → login loop with a real browser (Chrome, via `claude-in-chrome` — Next.js Server Actions can't be triggered by a raw `fetch` POST from a script; only a real browser submits the encoded action reference correctly). Read the console-logged reset link from Railway deploy logs, opened it, set a new password, and logged in with it successfully. Screenshotted the landing page, pricing page (correctly showed "Current plan" for the signed-in Pro account), and the shoot wizard page (copy-link button, usage bar, existing watermarked photos all intact).
- Note: the `Claude_Preview` screenshot tool was unreliable in this session (timed out repeatedly) even though the page was healthy — fell back to `preview_snapshot`/`preview_eval`/`preview_inspect` for the dev-server pass, and to `claude-in-chrome` for prod screenshots, which worked reliably throughout.

### Known gaps / next steps
- Testimonials on the landing page are placeholder quotes (clearly marked in code) — swap in real customer quotes once available.
- `resize_window` in the `claude-in-chrome` tool didn't visibly affect the screenshot viewport in this environment; mobile-layout confirmation instead came from the dev-server accessibility-tree pass (nav collapse + hamburger menu behavior), not a mobile screenshot.

## 2026-07-09 (later) — Mail delivery: SMTP → Resend (Railway blocks outbound SMTP)

User wanted to self-host a mail server (Postal) on Railway for the password-reset flow. Checked and it's not viable: **Railway blocks all outbound SMTP ports (25/465/587/2525) on Free/Trial/Hobby plans**, and even the Pro-plan exception is for relaying *through* a provider's SMTP endpoint, not running your own MTA — Postal needs unrestricted outbound port 25 to arbitrary destination mail servers (how SMTP delivery works), which is exactly the traffic every PaaS blocks hardest. Postal's own docs also assume a full VPS with Docker Compose/root access and a static IP with reverse-DNS (PTR) control, none of which Railway's container model provides.

Fix: switched `lib/mail.ts` from nodemailer/SMTP to **Resend's HTTPS API** (commit `ad3f4c0`) — HTTPS is never blocked, so this works on every Railway plan. Still falls back to console-logging the message when `RESEND_API_KEY` is unset. Manual one-time setup (documented in README, mirrors the Razorpay pattern): create a Resend account, verify **`mail.edantra.online`** (a subdomain, not the root `edantra.online`) so its SPF/DKIM records don't clash with the root domain's existing Hostinger email hosting, set `RESEND_API_KEY` and `MAIL_FROM` on Railway.

Not yet done: the user hasn't created the Resend account/API key yet, so prod is still on the console-log fallback for reset emails.

## 2026-07-09 (evening) — Resend fully wired up and verified end-to-end

Resend account created, `mail.edantra.online` domain added and DNS-verified (SPF/MX/DKIM records added to Hostinger's DNS Zone Editor for the root `edantra.online` zone, relative names `send.mail` and `resend._domainkey.mail`). `RESEND_API_KEY` and `MAIL_FROM` set on the Railway service; `MAIL_FROM` initially pointed at Resend's sandbox address (`onboarding@resend.dev`, which only sends to the account owner's own inbox) and was later switched to `Proof <no-reply@mail.edantra.online>` once the domain verified, unlocking sends to arbitrary recipients.

**Getting the Railway env vars to actually take effect was the hard part** — worth recording in detail since it cost significant time:
- Setting variables via the Railway MCP's `updateServiceTool` + triggering a deploy repeatedly reported success, but the running container never saw the new values (confirmed via a temporary `/api/debug-env` diagnostic route and via the real forgot-password send still hitting the console-fallback across 4 separate deploy cycles).
- Root cause: the Railway dashboard was showing an **"Apply N changes"** banner with a stuck, malformed pending change — `+ Service Domain: watermark\` (garbage data, likely from an earlier tool call) — which was silently blocking the *entire* batched changeset (including the real variable edits) from applying, because it tripped the account's "reached the limit for service domains per service" cap. Discarding just that one bad row from the pending-changes diff and clicking **Deploy Changes** let the real variable changes go through.
- Lesson: dashboard/API variable edits on this project can sit in a **staged-but-not-applied** state indefinitely; `redeploy`/`deployServiceTool` calls do NOT apply staged variable diffs — only the dashboard's own "Deploy Changes" confirmation does. If env vars don't seem to take effect after a Railway MCP update, check the dashboard for a pending-changes banner before assuming the deploy is broken.
- Fixed a real bug found in the process: `sendMail()` throwing on a Resend API error (e.g. the sandbox-recipient restriction) was crashing the forgot-password request with a raw 500 instead of degrading gracefully. Now caught and logged, falling through to the same generic success message (commit `6ce6cc6`).

**Verified**: real email delivery confirmed twice — once to the Resend account owner's own inbox (sandbox mode, before domain verification) and once to an arbitrary recipient (`test@testing.com`) after domain verification, both via the actual browser-driven forgot-password flow with no errors logged. The password-reset email pipeline is fully live in production.

---

## 2026-07-10 — Rename Shoot → Project; expand Free plan; locked-feature UX

Renamed the "Shoot" concept to "Project" everywhere: Prisma model/column (`ALTER TABLE`/`ALTER TABLE ... RENAME COLUMN`, metadata-only in Postgres — instant, zero data loss, confirmed against real prod data), API routes (`/api/shoots` → `/api/projects`), dashboard routes (`/dashboard/shoots` → `/dashboard/projects`), the wizard component (`ShootWizard` → `ProjectWizard`), and all user-facing copy across dashboard, wizard, gallery, and marketing pages.

Free plan: 1 → **2 active projects** (20 images/month total unchanged — that cap already summed across all of a user's projects).

Wizard UX: previously, Free-plan users hit a completely different, stripped-down step 1 with no visibility into what customization looks like. Now every plan sees the *same* full wizard — logo/text choice, saved templates, placement (diagonal/grid/custom/9-grid), size/opacity/rotation/margin — with Pro-gated controls shown greyed out and tagged with a "Pro" badge. An invisible overlay button sits on top of each locked control so clicking it (instead of doing nothing, or worse, silently failing) opens a new `PricingModal` — a self-contained pricing/upgrade dialog (reuses the existing `UpgradeButton`/Razorpay checkout) instead of navigating away. Free users still have a clear, unobstructed path to the actual product (default watermark → upload → download) via "Continue with the default watermark" / "Skip" actions alongside the locked panel.

**Verified in prod** (existing paid test account `test@testing.com` and free test account `testphoto+pivot1@example.com`, both pre-dating the rename): old "Shoot" rows correctly appear as Projects with all photos/relations intact after the migration; Free account capped at exactly 2 projects (3rd attempt correctly rejected with the new copy); clicking a locked control (text input, placement section) opens the pricing modal instead of allowing edits; Pro account's step 2 renders fully unlocked with no badges and a working live preview, confirming the plan gate (`customWatermark`) still works correctly post-rename.

---

## 2026-07-10 (later) — Full-screen photo viewer + optimistic favorites

Added a reusable `PhotoViewer` component (`components/ui/PhotoViewer.tsx`) — a full-screen lightbox shared by both the client gallery (`app/gallery/[token]/GalleryGrid.tsx`, extracted from the gallery page as a client component) and the dashboard's watermarked-photos step (`ProjectWizard.tsx`). No external animation/gesture library: CSS-only fade+scale open/close (class-toggle driven, delayed unmount via `setTimeout` matching the transition duration), prev/next navigation (buttons, arrow keys, and swipe-to-navigate via pointer drag at 1x zoom, with wraparound), double-click and scroll-wheel zoom (native non-passive `wheel` listener so `preventDefault()` works, since React's `onWheel` is passive by default), pointer-drag pan when zoomed in, Escape/backdrop/X to close, and body-scroll lock while open. A `renderActions` slot lets each caller supply its own footer control — a "Save original" download link in the wizard, a favorite-toggle button in the gallery.

Favorite toggling (`GalleryGrid.toggleFavorite`) is now optimistic: local state flips immediately on click, a quick scale/bounce animation plays (`@keyframes favorite-pop` in `globals.css`, applied to both the grid badge and the pill button), and the `POST /api/gallery/[token]/select` request happens in the background — reconciled with the server's actual value on success, reverted on failure. The select route was changed from a redirect-based form response to returning `{ id, selected }` JSON to support this.

Two minor render-time state adjustments in `PhotoViewer` (mount-on-open, zoom-reset-on-index-change) use React's guarded-render-body pattern instead of `useEffect`, to satisfy `react-hooks/set-state-in-effect` — confirmed clean via `tsc --noEmit` and `npm run lint`.

**Verified in prod** (client gallery at `/gallery/cmrby1ra800091mqhrip88rmo`): grid-level favorite toggle updates instantly with the bounce animation and persists across a full page reload; opening the viewer via "View photo" shows the correct image with working prev/next; toggling favorite *from inside the viewer* also updates instantly, and closing the viewer confirms the grid card and the "N favorited" counter both reflect the change immediately — the two surfaces stay in sync since they share the same `toggleFavorite` call and local `images` state.

---

## 2026-07-10 (later still) — Delete option for watermarked photos

Added `DELETE /api/images/[imageId]` (owner-checked via `image.project.userId`) which removes the `Image` row and both the original and watermarked files from disk (`deleteFileFromStorage`, new helper in `lib/storage.ts`). Wired into `ProjectWizard.tsx`'s step 4: a trash-icon button overlaid on each grid thumbnail, and a red "Delete" action next to "Save original" inside the `PhotoViewer`. Both paths call the same `deleteImage(id)`, which confirms first (`window.confirm` — this is a genuinely irreversible action, unlike the favorite toggle, so no optimistic-then-revert here), then removes the file/row and drops it from local state on success; the viewer closes itself afterward since the item it was showing may no longer exist.

Converting `images` from a plain prop to local `useState` (needed so a delete can update the grid without a full reload) introduced a real risk: the existing "+ Upload more" flow relies on `router.refresh()` re-fetching the server component and handing down a new `images` prop, but a `useState`'s initial value is only read once — later prop changes wouldn't reach already-mounted local state. Fixed with the same render-time-adjustment pattern already used in `PhotoViewer` (compare the incoming prop reference against the last-seen one, resync if different) rather than a `useEffect`.

**Verified in prod** (`test@testing.com`, project "john's bday", 3 photos): deleting via the grid's trash icon removed the photo immediately and the usage counter dropped (4 → 3), confirmed to persist across a full reload; deleting the same way from inside `PhotoViewer` also worked, closing the viewer and leaving the grid at 1 photo (counter 3 → 2). Testing note: the `claude-in-chrome` automation couldn't drive the native `window.confirm()` dialog directly (clicks landed but no request fired, dialog presumably auto-cancelled) — worked around by overriding `window.confirm = () => true` via the page's JS console before clicking, which exercises the exact same code path a real user's "OK" click would.

---

## 2026-07-10 (night) — Google Drive import in the upload step

Users can now paste a Google Drive link (a folder or a single photo) in step 3 as an alternative to uploading from disk (commit `5ac1510`). Design decision (user chose from options): **share-link + server-side API key**, not OAuth — the user pastes a link shared as "Anyone with the link", and the server talks to the Drive API v3 with a `GOOGLE_API_KEY`. No Google sign-in, no consent screen, no app-verification review; the tradeoff is it can't reach private files.

- `lib/google-drive.ts`: `extractDriveId` handles all common link shapes (`/folders/<id>`, `/file/d/<id>`, `?id=<id>`, bare ID — verified against samples of each), metadata fetch, paginated folder listing (direct children only, `.jpg`/`.png` filtered in the Drive query itself), and `alt=media` download. All errors surface a hint about link-sharing since that's the overwhelmingly likely cause.
- `lib/upload-pipeline.ts`: the quota-check → watermark-per-project-config → save-original+watermarked → `Image` row pipeline, extracted from the local upload route so both paths share one implementation (`processImageUploads`). Also exposes `getRemainingQuota` so the Drive route can reject an over-quota folder *before* downloading its contents.
- `app/api/projects/[id]/import-drive/route.ts`: POST `{ url }` → resolves the link, lists images (folder) or validates the single file, preflights quota, downloads, and runs the shared pipeline. Returns the same `{ uploaded, skipped }` shape as the upload route.
- Wizard step 3 gained an "Import from Google Drive" field + Import button under an "or" divider below the drag-and-drop area, reusing the existing `notice` banner for results/errors.
- Setup documented in README ("Google Drive import setup") + `.env.example`: enable the Drive API in Google Cloud Console, create an API key, restrict it to the Drive API, set `GOOGLE_API_KEY`.

**Verified in prod**: the field renders correctly in step 3; pasting a folder link and clicking Import POSTs to `/api/projects/[id]/import-drive` and — with `GOOGLE_API_KEY` not yet set on Railway — fails gracefully with a 400 and the banner "Google Drive import isn't configured on this server." (no crash). **Not yet verified: an actual import** — blocked on the one-time manual Google Cloud Console setup (user action), after which a real folder/file import should be clicked through once.

---

## 2026-07-11 — Paywall rework using conversion research (commit `0c17bf8`)

User shared a transcript of paywall-conversion research (Mobbin's study of ~3,000 paywalls) and asked to apply it. Adopted the trust-preserving patterns; deliberately skipped the dark ones (fake urgency, countdown discounts, spin-the-wheel, fabricated social proof — the last also being an established convention of this project).

What changed:
- **`PricingModal`**: rebuilt from three feature-card columns into a **comparison table** (research: "tables do a good job of showcasing what you're missing"), rows = projects/images/own-watermark/placement+templates/gallery, columns = Free ("Your plan" chip) / Pro (highlighted column + "Most popular") / Studio. Header is now **outcome-framed** ("Put your own brand on every photo you send") instead of feature-framed ("Upgrade to unlock this feature"). **Per-day price anchors** under each paid price ("about ₹33 a day" / "about ₹100 a day"). Footer: **"No commitment — cancel anytime."** plus the honest billing-period line.
- **`UpgradeButton`**: optional `cta` prop (modal passes "Unlock Pro"/"Unlock Studio" — action-framed, not generic "Continue") and a **right chevron** on the button (the researcher's observation: most winning paywalls have it).
- **`/pricing` page**: same per-day anchor under paid prices + "No commitment — cancel anytime" under upgrade CTAs.
- **`ProjectWizard`**: the modal `reason` line reframed to speak to the outcome ("your logo or studio name on every proof…").

**Verified in prod** (Free account `testphoto+pivot1@example.com`): clicking a Pro-locked card opens the new modal with all elements rendering correctly (screenshot taken — table, highlighted Pro column, anchors, chevron CTAs, cancel-anytime footer); `/pricing` shows the anchors and subtitles. Not adopted (noted for later consideration): multi-page paywall flow, exit-intent sheet (needs an annual/monthly split we don't have), free trials (Razorpay setup currently has none — a trial on the annual-equivalent plan would be the research-backed next experiment if conversion needs a push).

---

## 2026-07-11 (later) — Loading overlay + a real button for logo upload; Google Drive key finally live

Two small UX fixes (commit `f69a624`), plus closing the loop on the Drive import key:

- **Loading overlay with rotating tips**: watermarking a batch or importing from Drive takes a few seconds, so a full-cover overlay (`LoadingOverlay` in `ProjectWizard.tsx`) now shows a spinner + a rotating product tip (reset-on-activate via the render-time-adjustment pattern, not an Effect, to satisfy `react-hooks/set-state-in-effect`) instead of the step looking frozen.
- **Logo file picker restyled**: the bare native "Choose File / No file chosen" text is now a real button ("Choose PNG file" / "Choose a different PNG"), with a green checkmark + "*filename* selected" confirmation line once a file is picked.
- **`GOOGLE_API_KEY`**: after several rounds of the user setting it on Railway, confirmed live in prod — pasting a fake Drive folder link now returns a genuine Google-API 404 ("That Drive link couldn't be found…") instead of "isn't configured on this server." Drive import is fully functional.

**Verified in prod**: loading overlay screenshotted mid-import (spinner + label + tip); Drive key confirmed live via the 404 test above. Also updated the marketing Hero's mock gallery URL and the dashboard's new-project placeholder text from stale example copy ("Sharma Wedding") to "Tejas work" (commits `49f19ce`, `4e3f10c`), including a pre-existing uncommitted edit found in the working tree that was folded into the commit as-is.

---

## 2026-07-13 — Per-project storage limits, project delete, selective Drive import, client feedback

Four features requested together (commit `d020489`), plus a clarifying round on specifics before building: Pro/Studio storage limits (Pro 5 GB, Studio unlimited — Free's 200 MB/project was given), feedback as one text note per photo (not a single project-wide box), and the Drive "apply watermarking" ask turned out to mean **selecting which photos from a folder** to import, not a watermark on/off toggle.

- **Storage**: `Image.sizeBytes` (new column, original+watermarked combined) populated in `lib/upload-pipeline.ts`; `PLANS[plan].maxStorageMBPerProject` (Free 200, Pro 5120, Studio `Infinity`) enforced there too — files are skipped once a project would exceed its cap, with a clear upgrade-flavored error if nothing could fit. Usage bars added to the dashboard project list, the project detail page, `/pricing`, and the `PricingModal`'s comparison table (new "Storage per project" row, sourced from `lib/plans.ts` directly rather than hardcoded, so it can't drift).
- **Project delete**: `DELETE /api/projects/[id]` removes every file under `{userId}/{projectId}/` in one shot (new `deleteProjectStorage` in `lib/storage.ts`, `fs.rm` recursive) then deletes the `Project` row (cascades `Image` rows via the existing FK). A trash-icon `DeleteProjectButton` (client component, `window.confirm` gated) sits on each dashboard project card; the list item was restructured so the delete button and the "Open →"/title links are siblings rather than nesting a `<button>` inside the card's `<Link>`.
- **Selective Drive import**: previously, pasting a folder link watermarked every image in it. Now the "Import" button became "Browse" — it calls a new `POST .../import-drive/list` endpoint (lists a folder's images via the existing `lib/google-drive.ts` helpers, or resolves a single-file link immediately with nothing to pick) and shows a checklist with "Select all"/"Select none". The real import endpoint gained an optional `fileIds` array; when present it re-verifies each ID server-side via `getDriveMetadata` rather than trusting the client's earlier listing, and only those files are downloaded/watermarked.
- **Client feedback**: `Image.feedback` (nullable text) + public `POST /api/gallery/[token]/feedback` (same token-ownership check as the existing favorite-select route). Each gallery card gained a textarea + "Send feedback" button below the existing Favorite button — kept as a separate control, not merged into favoriting. The photographer sees it in the step-4 grid as `💬 {feedback}` under the "★ Client favorite" tag, using the same conditional-render pattern.

**Verified in prod**, with a detour: initial testing showed login silently failing on `watermark.edantra.online` (stayed on `/login`, no error, no state change) while the Railway-generated fallback domain worked normally for the same credentials. A pre-existing stale session on one tab briefly made this look like a false alarm, but a controlled test — submitting a *deliberately wrong* password on the custom domain — settled it: **no error surfaces at all** (no `?error=1`, no banner), categorically different from the fallback domain's correct "Invalid email or password" response to the identical input. This is a real, reproducible bug in the custom domain's auth-redirect handling (consistent with the earlier `localhost:8080` callback-URL finding from the same session), still unresolved — not caused by this or the prior chapter's code changes, since the fallback domain's login/signup both work correctly and the app's deploy/HTTP logs are clean. Verification proceeded using a working session: storage bars confirmed on all four surfaces (dashboard list, project page, `/pricing`, `PricingModal`); project delete button present and correctly labeled; Drive "Browse" button confirmed reaching Google's API and surfacing a proper not-found error (no real folder was available to exercise the full checklist, so that part is code-reviewed rather than click-tested); client-side feedback fully verified end-to-end (textarea → save → 200 → persists across reload) using a generated test image uploaded via `sharp`. The dashboard-side `💬` display was not click-tested live (auth issues ate the remaining time) but is a direct structural copy of the already-proven `image.selected` render in the same component.

## 2026-07-13 (later) — Branding: new favicon + wordmark logo everywhere

Two brand assets the user dropped in the working tree (`app/new favicon.svg`, `app/proof_logo.svg`) needed wiring in:

- **Favicon**: moved to `app/icon.svg` — the Next.js App Router's special-file convention (confirmed against this project's bundled Next.js 16 docs before touching it, per `AGENTS.md`'s "read the docs first" instruction) auto-injects the `<link rel="icon">` tag with no metadata config needed. Deleted the stock, never-customized `app/favicon.ico` from the very first commit so there's no stale fallback icon.
- **Logo**: `proof_logo.svg` is a stylized script wordmark (paths only, no background) — inlined its 4 paths directly into `components/site/Logo.tsx` with `fill="currentColor"` (replacing the old shield-icon-in-a-badge + "Proof" text mark), so it inherits `text-zinc-900 dark:text-zinc-50` like the rest of the site's theme-aware chrome instead of hardcoding a color that would go invisible against one of the two themes. `app/(auth)/layout.tsx` had its own duplicated copy of the old inline logo markup (not routed through the shared component) — replaced with `<Logo />` so there's exactly one place this ever needs to change again.
- Confirmed via `grep` that `Header`, `Footer`, the dashboard layout, and the gallery page header all already render the shared `<Logo />`, so this one component swap reaches every place the brand mark appears.

**Verified locally** (dev server, since the homepage/pricing/auth chrome don't touch the DB): wordmark renders legibly in both dark mode (white-on-dark header) and light mode (dark-on-light header) via `currentColor`; `curl` confirmed `/icon.svg` responds `200 image/svg+xml` and the page's `<head>` contains the generated `<link rel="icon" href="/icon.svg?...">` tag.

---

## 2026-07-13 (night) — Waitlist gate on Pro/Studio upgrades

Free-plan users hitting an upgrade CTA now see a waitlist form instead of Razorpay checkout — a deliberate pause on paid upgrades to measure real demand (email required, phone and Instagram optional) before turning payments back on.

- **Explicitly did not touch the Razorpay flow.** `UpgradeButton` (`app/(marketing)/pricing/UpgradeButton.tsx`) gained one new optional prop, `onIntercept?: () => boolean` — if it returns `true`, `handleClick` returns immediately before any of the existing checkout code runs. Every other code path in that file is untouched, so a caller that doesn't pass `onIntercept` behaves exactly as before.
- **`WaitlistEntry` model** (new, additive migration): `email`, optional `phone`/`instagram`, `plan` (PRO or STUDIO — which tier they wanted), optional `userId` (`onDelete: SetNull`, so deleting a user doesn't lose the interest data). Public `POST /api/waitlist` validates email format and a valid plan, attaches the signed-in `userId` if there is one.
- **`WaitlistModal`** (`components/ui/WaitlistModal.tsx`): email/phone/Instagram form → success state ("You're on the list!"). Reused in two places via the new `onIntercept` hook:
  - `PricingModal` (the locked-feature modal in `ProjectWizard`) — gated whenever `currentPlan === "FREE"`, which is the only value it's ever actually opened with today, but written so a hypothetical future Pro-user invocation would correctly fall through to real checkout instead.
  - `/pricing` page — a new `TierAction` client wrapper (page.tsx is a Server Component) gates on `user.plan === "FREE"`; a signed-in Pro user looking at the Studio tier still gets real checkout, per the literal scope of the request ("a user on the Free plan").
- Scope decision worth recording: the existing `PricingModal` comparison table (built during the conversion-research pass) stays exactly as designed — only the terminal "Unlock Pro"/"Unlock Studio" button action changes for Free users. Considered and rejected: skipping straight to the waitlist form the moment a locked feature is clicked, without showing the pricing/comparison info first — kept the informative step since the goal is to capture *genuinely* interested signups, not just clicks.

**Verified**: `tsc`, `lint`, and a full `npm run build` all pass (new `/api/waitlist` route compiles, migration `20260713180000_add_waitlist_entry` applied cleanly on boot). Logged-out `/pricing` render confirmed locally first (no regressions). Then fully click-tested in prod (Free account `testphoto+pivot1@example.com`, via the Railway fallback domain — the custom domain's login bug is still unresolved and unrelated to this feature):
- `/pricing` → "Upgrade to Pro" opens the WaitlistModal (not Razorpay); submitting with a test email returned `POST /api/waitlist` → `201` and showed the "You're on the list!" success state.
- Dashboard → locked "Text watermark" card → `PricingModal` → "Unlock Pro" opens the same `WaitlistModal`, correctly stacked on top (z-[60] over the pricing table's z-50).
- Confirmed via network-request inspection on both flows: **zero** requests to `razorpay` or `/api/billing/checkout` fired — the payment code path was never reached, as intended.

---

## 2026-07-13 (very late) — Basic rate limiting

User asked whether anything protects the server from being hammered/crashed — audit found **zero** rate limiting anywhere (no `middleware.ts`, no rate-limit package, nothing beyond the plan-based image/storage quotas, which cap a legit account's usage but do nothing against raw request volume or unauthenticated abuse).

Added `lib/rate-limit.ts`: an in-memory fixed-window limiter (`Map<key, {count, resetAt}>`, opportunistic cleanup every 5 min). Deliberately no Redis — this runs as a single Railway container, so an in-memory map is sufficient today; noted in the file's own comment that it resets on every restart/redeploy and won't be shared if this ever scales to multiple instances. `getClientIp()` reads `x-forwarded-for` (Railway sits behind a proxy, same header already trusted elsewhere in this codebase via `trustHost`). Wired into every public or expensive endpoint, keyed by user ID where authenticated and by IP otherwise:

- **Public, unauthenticated** (spam/abuse risk): `POST /api/waitlist` (5/10min), `POST /api/gallery/[token]/select` (60/min — generous, real clients click favorites repeatedly), `POST /api/gallery/[token]/feedback` (15/min), and the Server Actions behind `/login` (10/10min), `/signup` (5/hour), `/forgot-password` (5/hour — fails through to the same generic "sent" redirect on rate-limit, so it can't be used to distinguish rate-limited from a real send and leak account existence), `/contact` (5/hour).
- **Authenticated, CPU/IO-heavy** (crash risk — `sharp` watermarking runs synchronously on a single Node process, no queue): `POST /api/projects/[id]/upload` (10/min), `import-drive` and `import-drive/list` (10/min and 15/min), `watermark-preview` (60/min — already client-debounced at 350ms, this is just a hard ceiling).
- **Payment-adjacent**: `POST /api/billing/checkout` (5/min) — stops scripted Razorpay-subscription-creation spam.
- Deliberately left un-limited: authenticated CRUD on a user's own resources with no external side effects (project/template/image delete, downloads) — already bounded by plan quotas and ownership checks, not a meaningful abuse surface.

All limiters return a 429 with a `Retry-After` header (API routes) or redirect to the existing error-banner UI with a new `error=rate-limited` case (Server Action forms) — no new UI components needed, just one more branch in each page's existing `FormMessage` block.

**Verified**: `tsc`, `lint`, and `npm run build` all pass.

---