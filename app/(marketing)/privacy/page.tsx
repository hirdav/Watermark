export const metadata = { title: "Privacy Policy — Proof" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: July 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">What we collect</h2>
          <p className="mt-2">
            Your account email and name, the photos you upload for watermarking, shoot titles you create, and
            billing details processed by our payment provider (we never see or store your card details ourselves).
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">How we use it</h2>
          <p className="mt-2">
            Solely to run the service: authenticating you, storing and watermarking your photos, generating
            your client gallery links, and enforcing your plan&apos;s usage limits. We don&apos;t sell your data
            or your clients&apos; data to anyone.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Client galleries</h2>
          <p className="mt-2">
            Each gallery is reachable only via its private, unguessable link. We don&apos;t index galleries
            publicly or list them anywhere searchable.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Data retention</h2>
          <p className="mt-2">
            Your photos and shoots are retained for as long as your account is active. You can delete a shoot
            or your account at any time by contacting us.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Contact</h2>
          <p className="mt-2">
            Questions about this policy? Reach out via the{" "}
            <a href="/contact" className="underline">
              contact page
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
