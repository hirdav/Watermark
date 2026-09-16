# Proof — invisible watermark client proofing

Photographers upload a project, get a shareable client gallery protected by an invisible,
forensic diagonal watermark (only revealed by boosting contrast — e.g. Photoshop Levels).
Free/Pro/Studio tiers, billed via Razorpay subscriptions.

## Stack

Next.js (App Router) + TypeScript + Tailwind, Prisma (Postgres via `@prisma/adapter-pg`),
Auth.js (Credentials/JWT), local-disk image storage, Razorpay subscriptions.

## Local setup

Requires a reachable Postgres instance — point `DATABASE_URL` at it (e.g. the Railway
Postgres addon's connection string, or a local Postgres install).

```bash
npm install
npx prisma migrate dev   # creates prisma/migrations, applies to DATABASE_URL
npm run dev
```

Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `AUTH_SECRET` (generate with
the command in the file). Razorpay variables are optional for local dev of the watermarking
flow itself — only required to test the billing/pricing page.

Uploaded and watermarked images are written to `STORAGE_DIR` (default `./storage`,
gitignored). On Railway, mount a persistent volume at this path.

## Resend setup (manual, one-time — for password-reset and contact-form email)

Emails are sent via [Resend](https://resend.com)'s HTTPS API rather than SMTP, because Railway
(and most PaaS hosts) block outbound SMTP ports on lower tiers — HTTPS is never blocked. Without
this configured, reset links are logged to the server console instead of emailed (fine for local
dev, not for production).

1. Create a free Resend account → API Keys → generate a key → set `RESEND_API_KEY`.
2. Domains → Add Domain → verify a **subdomain** of your site, e.g. `mail.yourdomain.com`, not the
   root domain. This keeps Resend's SPF/DKIM records isolated from any existing mail hosting
   (e.g. Hostinger email) on the root domain — add the TXT/MX records Resend gives you to that
   subdomain's DNS zone.
3. Set `MAIL_FROM="Proof <no-reply@mail.yourdomain.com>"` (must use the verified subdomain).

## Google Drive import setup (manual, one-time, optional)

Lets users paste a Drive folder or file link (shared as "Anyone with the link") in the
upload step, instead of only uploading from disk. Uses an API key rather than OAuth —
simpler to set up, but only works against publicly-link-shared files, not private ones.

1. Create/select a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. APIs & Services → Library → enable the **Google Drive API**.
3. APIs & Services → Credentials → Create Credentials → API key → set `GOOGLE_API_KEY`.
4. Restrict the key to the Drive API (Credentials → edit the key → API restrictions) since
   it has no user auth attached to limit its blast radius.

Without this configured, the "Import from Google Drive" field returns a clear error instead
of silently failing.

## Razorpay setup (manual, one-time)

1. Create a Razorpay account and switch to **Test Mode**.
2. Settings → API Keys → generate a Key ID/Secret → set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
3. Subscriptions → Plans → create two recurring monthly plans ("Pro", "Studio") → copy their
   `plan_id`s into `RAZORPAY_PLAN_ID_PRO` / `RAZORPAY_PLAN_ID_STUDIO`.
4. Settings → Webhooks → add a webhook pointing at `https://<your-deployed-domain>/api/billing/webhook`,
   subscribe to `subscription.activated`, `subscription.charged`, `subscription.cancelled`,
   `subscription.halted` → copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`.
   This requires a public URL, so it only works once deployed (or tunneled) — the webhook
   route's signature verification can still be exercised locally with a hand-crafted request.

## Deploying to Railway

1. Provision a Postgres addon, point `DATABASE_URL` at it, run `npx prisma migrate deploy`.
2. Mount a persistent volume at the path set in `STORAGE_DIR` (e.g. `/data/storage`).
3. Set all the env vars from `.env.example` (including live/test Razorpay keys) in the
   Railway service.
4. Add the custom domain on the Railway service and point its DNS CNAME at Railway's target.
5. Once live, register the Razorpay webhook against the public `/api/billing/webhook` URL
   and copy the resulting secret into `RAZORPAY_WEBHOOK_SECRET`.

## Plan limits

Defined in `lib/plans.ts`: Free (2 projects, 20 images/mo total, fixed watermark text), Pro (500
images/mo, custom watermark text), Studio (unlimited). Enforced in
`lib/upload-pipeline.ts`, shared by both the local-file and Google Drive upload routes.
#planning to move with Supabase 
