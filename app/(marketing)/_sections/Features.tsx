const FEATURES = [
  { title: "Batch upload", body: "Drag and drop an entire shoot at once instead of one file at a time." },
  { title: "Logo or text watermark", body: "Use a transparent PNG logo or styled text — your choice, per shoot." },
  { title: "Full placement control", body: "Diagonal tiled pattern, repeat grid, 9-point positions, or click-to-place anywhere." },
  { title: "Saved templates", body: "Save a watermark setup once, apply it to every future shoot in a click." },
  { title: "Private client galleries", body: "Each shoot gets its own unshared link — no login required for clients." },
  { title: "Favorite & deliver", body: "Clients tap to favorite; you download just those, at full original quality." },
  { title: "Plan-based limits", body: "Free, Pro, and Studio tiers scale with how many shoots and images you need." },
  { title: "Your images stay yours", body: "Originals and watermarked copies are stored privately, never shared with anyone else." },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">Features</h2>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Everything you need to proof with confidence
        </p>
      </div>

      <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
              <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
