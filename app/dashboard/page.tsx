import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { Banner } from "@/components/ui/Banner";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; upgraded?: string }>;
}) {
  const { error, upgraded } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const planConfig = PLANS[user.plan];

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { images: true } } },
  });

  async function createProjectAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");

    const title = (formData.get("title") as string)?.trim();
    if (!title) redirect("/dashboard?error=title");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const planConfig = PLANS[user.plan];
    const projectCount = await prisma.project.count({ where: { userId: user.id } });
    if (projectCount >= planConfig.maxProjects) {
      redirect("/dashboard?error=limit");
    }

    const project = await prisma.project.create({ data: { userId: user.id, title } });
    redirect(`/dashboard/projects/${project.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Your projects</h1>
          <p className="mt-1 text-sm text-zinc-500">Create a project, watermark it, and share the gallery link.</p>
        </div>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
          {planConfig.label} plan
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {upgraded && <Banner kind="success">You&apos;re now on the {planConfig.label} plan — new limits are active immediately.</Banner>}
        {error === "limit" && (
          <Banner kind="error">
            Your {planConfig.label} plan allows up to {planConfig.maxProjects} active project(s).{" "}
            <Link href="/pricing" className="font-medium underline">
              Upgrade
            </Link>{" "}
            to create more.
          </Banner>
        )}
        {error === "title" && <Banner kind="error">Please enter a title for the project.</Banner>}
      </div>

      <form action={createProjectAction} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          name="title"
          placeholder="e.g. Sharma Wedding — Dec 2026"
          required
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50/10"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New project
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-2.5">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/dashboard/projects/${project.id}`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{project.title}</p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {project._count.images} photo{project._count.images === 1 ? "" : "s"}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-zinc-400 transition-colors group-hover:text-zinc-900">
                Open →
              </span>
            </Link>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-14 text-center dark:border-zinc-700">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.969zM12 7a1 1 0 11-2 0 1 1 0 012 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">No projects yet</p>
              <p className="mt-1 text-sm text-zinc-500">Create your first one above to get a shareable gallery link.</p>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
