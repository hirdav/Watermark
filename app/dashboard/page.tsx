import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const planConfig = PLANS[user.plan];

  const shoots = await prisma.shoot.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { images: true } } },
  });

  async function createShootAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");

    const title = (formData.get("title") as string)?.trim();
    if (!title) redirect("/dashboard?error=title");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const planConfig = PLANS[user.plan];
    const shootCount = await prisma.shoot.count({ where: { userId: user.id } });
    if (shootCount >= planConfig.maxShoots) {
      redirect("/dashboard?error=limit");
    }

    const shoot = await prisma.shoot.create({ data: { userId: user.id, title } });
    redirect(`/dashboard/shoots/${shoot.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Your shoots</h1>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {planConfig.label} plan
        </span>
      </div>

      {error === "limit" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Your {planConfig.label} plan allows up to {planConfig.maxShoots} active shoot(s).{" "}
          <Link href="/pricing" className="underline">
            Upgrade
          </Link>{" "}
          to create more.
        </p>
      )}
      {error === "title" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Please enter a title for the shoot.
        </p>
      )}

      <form action={createShootAction} className="mt-6 flex gap-2">
        <input
          type="text"
          name="title"
          placeholder="e.g. Sharma Wedding — Dec 2026"
          required
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          New shoot
        </button>
      </form>

      <ul className="mt-8 divide-y divide-zinc-200 dark:divide-zinc-800">
        {shoots.map((shoot) => (
          <li key={shoot.id} className="flex items-center justify-between py-4">
            <div>
              <Link
                href={`/dashboard/shoots/${shoot.id}`}
                className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
              >
                {shoot.title}
              </Link>
              <p className="text-sm text-zinc-500">
                {shoot._count.images} photo{shoot._count.images === 1 ? "" : "s"}
              </p>
            </div>
            <Link
              href={`/dashboard/shoots/${shoot.id}`}
              className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
            >
              Open →
            </Link>
          </li>
        ))}
        {shoots.length === 0 && (
          <li className="py-8 text-center text-sm text-zinc-500">No shoots yet — create your first one above.</li>
        )}
      </ul>
    </div>
  );
}
