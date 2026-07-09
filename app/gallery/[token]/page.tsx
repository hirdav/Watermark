import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/site/Logo";

export default async function GalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shoot = await prisma.shoot.findUnique({
    where: { shareToken: token },
    include: { images: { orderBy: { createdAt: "desc" } } },
  });
  if (!shoot) notFound();

  const favoriteCount = shoot.images.filter((i) => i.selected).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Logo />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{shoot.title}</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Tap a photo to mark it as a favorite
          {favoriteCount > 0 && (
            <>
              {" "}
              — <span className="font-medium text-amber-600 dark:text-amber-500">{favoriteCount} favorited</span>
            </>
          )}
          .
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {shoot.images.map((image) => (
            <div
              key={image.id}
              className={`group overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-zinc-900 ${
                image.selected
                  ? "border-amber-400 ring-2 ring-amber-400/40"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
              }`}
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/gallery/${token}/images/${image.id}`}
                  alt=""
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                {image.selected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M10 2a1 1 0 01.894.553l1.382 2.764 3.05.443a1 1 0 01.555 1.706l-2.208 2.152.521 3.038a1 1 0 01-1.451 1.054L10 12.347l-2.743 1.363a1 1 0 01-1.451-1.054l.521-3.038-2.208-2.152a1 1 0 01.555-1.706l3.05-.443L9.106 2.553A1 1 0 0110 2z" />
                    </svg>
                  </span>
                )}
              </div>
              <form action={`/api/gallery/${token}/select`} method="POST" className="border-t border-zinc-100 dark:border-zinc-800">
                <input type="hidden" name="imageId" value={image.id} />
                <button
                  type="submit"
                  className={`flex w-full items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                    image.selected
                      ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  {image.selected ? "★ Favorited" : "☆ Favorite"}
                </button>
              </form>
            </div>
          ))}
        </div>

        {shoot.images.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.969zM12 7a1 1 0 11-2 0 1 1 0 012 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">No photos yet</p>
            <p className="text-sm text-zinc-500">Check back once the photographer uploads this shoot.</p>
          </div>
        )}
      </div>
    </div>
  );
}
