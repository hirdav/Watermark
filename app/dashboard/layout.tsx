import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { Logo } from "@/components/site/Logo";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-600 sm:flex dark:text-zinc-400">
              <Link href="/dashboard" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                Projects
              </Link>
              <Link href="/pricing" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                Pricing
              </Link>
              {isAdmin && (
                <Link href="/dashboard/admin/waitlist" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                  Waitlist
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden truncate text-sm text-zinc-400 sm:inline dark:text-zinc-600">{session?.user?.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
        <nav className="flex items-center gap-5 border-t border-zinc-100 px-6 py-2 text-sm font-medium text-zinc-600 sm:hidden dark:border-zinc-800 dark:text-zinc-400">
          <Link href="/dashboard" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
            Projects
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
            Pricing
          </Link>
          {isAdmin && (
            <Link href="/dashboard/admin/waitlist" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
              Waitlist
            </Link>
          )}
        </nav>
      </header>
      <main className="flex-1 px-6 py-8 sm:py-10">{children}</main>
    </div>
  );
}
