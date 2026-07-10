const USE_CASES = [
  {
    icon: (
      <path d="M4 8a2 2 0 012-2h1.17a2 2 0 001.42-.59l.82-.82A2 2 0 0110.83 4h2.34a2 2 0 011.42.59l.82.82A2 2 0 0016.83 6H18a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8zm8 2a3 3 0 100 6 3 3 0 000-6z" />
    ),
    title: "Photographers",
    body: "Wedding, portrait, and event projects — send proofs same-day without risking full-res leaks.",
  },
  {
    icon: (
      <path d="M2 3.5A1.5 1.5 0 013.5 2h13A1.5 1.5 0 0118 3.5v13a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 16.5v-13zM4 5v10h12V5H4zm2 2h4v2H6V7z" />
    ),
    title: "Designers",
    body: "Share mockups and concept art with clients for sign-off before handing over final assets.",
  },
  {
    icon: (
      <path d="M10 2a1 1 0 01.894.553l1.382 2.764 3.05.443a1 1 0 01.555 1.706l-2.208 2.152.521 3.038a1 1 0 01-1.451 1.054L10 12.347l-2.743 1.363a1 1 0 01-1.451-1.054l.521-3.038-2.208-2.152a1 1 0 01.555-1.706l3.05-.443L9.106 2.553A1 1 0 0110 2z" />
    ),
    title: "Content creators",
    body: "Preview paid content or commissions to buyers without giving away the deliverable upfront.",
  },
  {
    icon: (
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h8a2 2 0 012 2v14l-6-3-6 3V4z"
        clipRule="evenodd"
      />
    ),
    title: "Businesses & brands",
    body: "Product photography and marketing assets, reviewed internally before public release.",
  },
  {
    icon: (
      <path d="M9 6a3 3 0 116 0 3 3 0 01-6 0zM17 6a3 3 0 11-2.83 4H12v-2h2.17A3 3 0 0117 6zM3 6a3 3 0 105.83 2H7v-2H5.83A3 3 0 003 6zm3 8a4 4 0 118 0v2H6v-2zm-4 2v-1.5A3.5 3.5 0 014.5 11H5a5.98 5.98 0 00-1 3v2H2zm16 0v-2a5.98 5.98 0 00-1-3h.5a3.5 3.5 0 013.5 3.5V16h-3z" />
    ),
    title: "Agencies",
    body: "Manage proofing for multiple clients at once, with per-project branding and share links.",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20 bg-zinc-50 py-20 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">Who it&apos;s for</h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Built for anyone who shares work before it&apos;s paid for
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((uc) => (
            <div
              key={uc.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  {uc.icon}
                </svg>
              </span>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">{uc.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{uc.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
