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
          {project.studioLogoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/gallery/${token}/studio-logo`} alt={project.studioName ?? "Studio logo"} className="h-8 w-auto sm:h-10" />
          ) : project.studioName ? (
            <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{project.studioName}</span>
          ) : (
            <Logo />
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {project.clientName ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{project.title}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome, {project.clientName}
            </h1>
          </>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{project.title}</h1>
        )}
        {project.welcomeMessage && <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{project.welcomeMessage}</p>}
        <GalleryGrid
          token={token}
          images={project.images.map((image) => ({ id: image.id, selected: image.selected, feedback: image.feedback }))}
        />
      </div>
    </div>
  );
}
