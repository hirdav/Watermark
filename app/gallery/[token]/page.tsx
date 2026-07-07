import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function GalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shoot = await prisma.shoot.findUnique({
    where: { shareToken: token },
    include: { images: { orderBy: { createdAt: "desc" } } },
  });
  if (!shoot) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{shoot.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">Tap a photo to mark it as a favorite.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {shoot.images.map((image) => (
          <div key={image.id} className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/gallery/${token}/images/${image.id}`}
              alt=""
              className="aspect-square w-full object-cover"
            />
            <form
              action={`/api/gallery/${token}/select`}
              method="POST"
              className="flex justify-center border-t border-zinc-200 py-2 dark:border-zinc-800"
            >
              <input type="hidden" name="imageId" value={image.id} />
              <button
                type="submit"
                className={`text-sm font-medium ${
                  image.selected ? "text-amber-600" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {image.selected ? "★ Favorited" : "☆ Favorite"}
              </button>
            </form>
          </div>
        ))}
      </div>
      {shoot.images.length === 0 && <p className="mt-8 text-center text-sm text-zinc-500">No photos yet.</p>}
    </div>
  );
}
