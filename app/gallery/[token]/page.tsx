import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/site/Logo";
import { GalleryGrid } from "./GalleryGrid";

export default async function GalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: { images: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Logo />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{project.title}</h1>
        <GalleryGrid
          token={token}
          images={project.images.map((image) => ({ id: image.id, selected: image.selected }))}
        />
      </div>
    </div>
  );
}
