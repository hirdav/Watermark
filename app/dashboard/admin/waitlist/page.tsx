import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";

export default async function AdminWaitlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdminEmail(session.user.email)) notFound();

  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, plan: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Waitlist entries</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {entries.length} signup{entries.length === 1 ? "" : "s"}
          </p>
        </div>
        <a
          href="/api/admin/waitlist/export"
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Export CSV
        </a>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Wants</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Instagram</th>
              <th className="px-4 py-3">Existing account</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{entry.email}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{entry.plan}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{entry.phone ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{entry.instagram ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {entry.user ? `${entry.user.plan} · ${entry.user.email}` : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                  {entry.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <p className="px-4 py-10 text-center text-sm text-zinc-500">No waitlist signups yet.</p>}
      </div>
    </div>
  );
}
