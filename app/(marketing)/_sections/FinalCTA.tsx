import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 px-8 py-16 text-center dark:bg-zinc-50">
        <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute -left-10 -top-10 h-56 w-56 rounded-full bg-amber-400 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-zinc-500 blur-3xl" />
        </div>
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl dark:text-zinc-900">
            Ready to protect your next project?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-zinc-300 dark:text-zinc-600">
            Set up your first watermarked gallery in a few minutes — free to start, no credit card.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition-transform hover:scale-[1.03] dark:bg-zinc-900 dark:text-white"
          >
            Get started free
          </Link>
        </div>
      </div>
    </section>
  );
}
