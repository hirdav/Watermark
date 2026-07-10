export const metadata = { title: "Terms of Service — Proof" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Terms of Service</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: July 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Using the service</h2>
          <p className="mt-2">
            You&apos;re responsible for the content you upload and for having the rights to watermark and share
            it. Don&apos;t use the service to upload content you don&apos;t have the right to distribute.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Plans and billing</h2>
          <p className="mt-2">
            Paid plans renew monthly and can be cancelled at any time; cancelling stops future billing but
            doesn&apos;t retroactively refund the current period. Plan limits (projects, images/month, and
            customization) are described on the pricing page and enforced automatically.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Client galleries</h2>
          <p className="mt-2">
            Gallery links are private but not password-protected by default — anyone with the link can view
            watermarked proofs. Don&apos;t share a gallery link anywhere you wouldn&apos;t want it seen.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Availability</h2>
          <p className="mt-2">
            We aim for high uptime but don&apos;t guarantee uninterrupted service. Keep your own backups of
            originals you can&apos;t afford to lose.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Changes</h2>
          <p className="mt-2">We may update these terms from time to time; continued use means you accept the current version.</p>
        </section>
      </div>
    </div>
  );
}
