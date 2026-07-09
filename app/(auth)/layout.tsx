import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 1.5l7.5 3.5v5c0 4.28-3.13 7.86-7.5 8.5-4.37-.64-7.5-4.22-7.5-8.5V5l7.5-3.5z" />
            </svg>
          </span>
          Proof
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-8">{children}</main>
    </div>
  );
}
