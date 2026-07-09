const STEPS = [
  {
    n: "01",
    title: "Upload your photos",
    body: "Drag and drop a whole shoot at once — JPG or PNG, batch upload, no file-by-file busywork.",
  },
  {
    n: "02",
    title: "Add your watermark",
    body: "Your logo or studio text, placed exactly how you like: diagonal pattern, repeating grid, or a custom spot. Adjust size, opacity, and rotation with a live preview.",
  },
  {
    n: "03",
    title: "Share, select, deliver",
    body: "Send the private gallery link. Clients tap their favorites — you download just the clean, full-quality originals once they're chosen.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">How it works</h2>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Three steps from shoot to sign-off
        </p>
      </div>

      <div className="relative mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
        <div className="absolute left-0 right-0 top-8 hidden h-px bg-zinc-200 md:block dark:bg-zinc-800" aria-hidden="true" />
        {STEPS.map((step) => (
          <div key={step.n} className="relative rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
              {step.n}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
