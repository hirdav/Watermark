const FAQS = [
  {
    q: "What does the watermark actually protect against?",
    a: "It stops clients (or anyone with the gallery link) from using a full-quality photo before they've paid. Every proof shown in the gallery is watermarked with your logo or text; only the photos they favorite get delivered as clean originals, and only through your own download step.",
  },
  {
    q: "Can clients download the original, un-watermarked files?",
    a: "Only the ones they've marked as favorites, and only when you choose to send them — there's a separate \"download selected (originals)\" action that's entirely under your control.",
  },
  {
    q: "What image formats are supported?",
    a: "JPG and PNG uploads, batch or one at a time. PNG logos with transparency are supported for logo watermarks.",
  },
  {
    q: "What's included in the Free plan?",
    a: "One active shoot and 20 images a month with a default watermark, forever, no credit card required. Pro and Studio raise those limits and unlock your own logo/text, full placement control, and saved templates.",
  },
  {
    q: "Can I cancel or change plans anytime?",
    a: "Yes — billing is monthly with no lock-in. Upgrade, downgrade, or cancel whenever you need to.",
  },
  {
    q: "Is my client's data private?",
    a: "Each shoot gets its own unlisted gallery link. There's no public directory or search — only people you share the link with can view it.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-20">
      <div className="text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">FAQ</h2>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Common questions
        </p>
      </div>

      <div className="mt-12 divide-y divide-zinc-200 dark:divide-zinc-800">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-zinc-900 marker:content-none dark:text-zinc-50">
              {item.q}
              <svg
                className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-45"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M10 5a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 5z" clipRule="evenodd" />
              </svg>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
