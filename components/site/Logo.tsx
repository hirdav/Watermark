import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50 ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5l7.5 3.5v5c0 4.28-3.13 7.86-7.5 8.5-4.37-.64-7.5-4.22-7.5-8.5V5l7.5-3.5z" />
        </svg>
      </span>
      Proof
    </Link>
  );
}
