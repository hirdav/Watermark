// Placeholder quotes representative of the target workflow — swap in real
// customer testimonials once available.
const QUOTES = [
  {
    quote: "My clients get to see the full gallery same-day instead of waiting on a curated preview. The favorites step alone saves me an email thread every time.",
    name: "Ananya",
    role: "Wedding photographer",
  },
  {
    quote: "Being able to drop our own logo on every proof, in exactly the spot our brand guide calls for, is the detail that sold the rest of the team.",
    name: "Marcus",
    role: "Creative director, design studio",
  },
  {
    quote: "I stopped sending full-res previews the moment I found this. Clients pick, I deliver — no more guessing what got downloaded before payment.",
    name: "Priya",
    role: "Freelance content creator",
  },
];

export function Testimonials() {
  return (
    <section className="bg-zinc-50 py-20 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
            Why people switch
          </h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            What the workflow feels like
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {QUOTES.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <svg className="h-6 w-6 text-zinc-200 dark:text-zinc-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-1.1.9-2 2-2V8zm14 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-1.1.9-2 2-2V8z" />
              </svg>
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{t.name}</span>
                <span className="text-zinc-500"> — {t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
