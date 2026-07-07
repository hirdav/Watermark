import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, startOfCurrentBillingPeriod } from "@/lib/plans";

export default async function ShootDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string; skipped?: string; error?: string }>;
}) {
  const { id } = await params;
  const { uploaded, skipped, error } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const shoot = await prisma.shoot.findUnique({
    where: { id },
    include: { images: { orderBy: { createdAt: "desc" } } },
  });
  if (!shoot || shoot.userId !== session.user.id) notFound();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const planConfig = PLANS[user.plan];
  const usedThisPeriod = await prisma.image.count({
    where: { shoot: { userId: user.id }, createdAt: { gte: startOfCurrentBillingPeriod() } },
  });

  const galleryPath = `/gallery/${shoot.shareToken}`;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Shoots
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{shoot.title}</h1>
        <a
          href={`/api/shoots/${shoot.id}/download`}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Download all (.zip)
        </a>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
        <span className="text-zinc-500">Client gallery link:</span>
        <code className="flex-1 truncate text-zinc-900 dark:text-zinc-50">{galleryPath}</code>
        <Link href={galleryPath} target="_blank" className="font-medium text-zinc-900 underline dark:text-zinc-50">
          Open
        </Link>
      </div>

      <p className="mt-4 text-sm text-zinc-500">
        {usedThisPeriod} / {planConfig.maxImagesPerMonth === Infinity ? "unlimited" : planConfig.maxImagesPerMonth} images
        used this month on the {planConfig.label} plan.
      </p>

      {uploaded && (
        <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Uploaded {uploaded} photo(s){skipped ? ` — skipped ${skipped} unsupported file(s)` : ""}.
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {decodeURIComponent(error)}
        </p>
      )}

      <form
        action={`/api/shoots/${shoot.id}/upload`}
        method="POST"
        encType="multipart/form-data"
        className="mt-6 flex flex-wrap items-center gap-3 rounded-md border border-dashed border-zinc-300 p-4 dark:border-zinc-700"
      >
        <input type="file" name="files" accept="image/jpeg,image/png" multiple required className="text-sm" />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Upload &amp; watermark
        </button>
      </form>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {shoot.images.map((image) => (
          <div key={image.id} className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/images/${image.id}`}
              alt={image.filename}
              className="aspect-square w-full object-cover"
            />
            {image.selected && (
              <p className="bg-amber-100 px-2 py-1 text-center text-xs font-medium text-amber-800">
                ★ Client favorite
              </p>
            )}
          </div>
        ))}
      </div>
      {shoot.images.length === 0 && (
        <p className="mt-8 text-center text-sm text-zinc-500">No photos yet — upload above.</p>
      )}
    </div>
  );
}
