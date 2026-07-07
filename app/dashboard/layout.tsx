import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Link href="/dashboard" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Proof
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/dashboard">Shoots</Link>
          <Link href="/pricing">Pricing</Link>
          <span className="text-zinc-400 dark:text-zinc-600">{session?.user?.email}</span>
          <form action={logoutAction}>
            <button type="submit" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
              Log out
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
