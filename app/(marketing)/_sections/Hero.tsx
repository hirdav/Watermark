import Link from "next/link";

function MockGalleryCard({ hue, delay = 0 }: { hue: number; delay?: number }) {
  return (
    <div
      className="relative aspect-square overflow-hidden rounded-lg"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 88%), hsl(${hue + 25} 40% 72%))`,
      }}
    >
      <div
        className="absolute inset-0 flex flex-wrap content-center justify-center gap-x-6 gap-y-8 opacity-40"
        style={{ transform: "rotate(-30deg) scale(1.4)", animationDelay: `${delay}ms` }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="text-[11px] font-bold tracking-wider text-white/90 [text-shadow:0_1px_1px_rgba(0,0,0,0.35)]">
            PROOF
          </span>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center blur-3xl" aria-hidden="true">
        <div className="aspect-square w-[50rem] rounded-full bg-gradient-to-br from-amber-200/40 via-zinc-200/40 to-transparent dark:from-amber-500/10 dark:via-zinc-800/40" />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Built for photographers &amp; creative teams
          </span>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl dark:text-zinc-50">
            Share proofs.{" "}
            <span className="bg-gradient-to-br from-zinc-900 to-zinc-500 bg-clip-text text-transparent dark:from-zinc-50 dark:to-zinc-400">
              Protect the originals.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            Upload a project, watermark it your way, and send clients a private gallery link. They pick
            favorites — you deliver clean, full-quality files only after they&apos;ve chosen.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-zinc-900 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-700 hover:shadow-md sm:w-auto dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Get started free
            </Link>
            <Link
              href="#how-it-works"
              className="w-full rounded-lg border border-zinc-300 px-6 py-3 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 sm:w-auto dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-400">No credit card required · Free plan available forever</p>
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-1.5 px-2 pb-3 pt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
              <span className="ml-3 text-xs text-zinc-400">proof.app/gallery/Tajas-Work</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              <MockGalleryCard hue={210} />
              <MockGalleryCard hue={20} delay={80} />
              <MockGalleryCard hue={150} delay={160} />
              <MockGalleryCard hue={280} delay={240} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
