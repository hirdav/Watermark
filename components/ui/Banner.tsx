const STYLES = {
  error: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  success: "bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300",
  info: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

const ICONS = {
  error: (
    <path
      fillRule="evenodd"
      d="M18 10A8 8 0 112 10a8 8 0 0116 0zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
      clipRule="evenodd"
    />
  ),
  success: (
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
      clipRule="evenodd"
    />
  ),
  info: (
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-3.5a1 1 0 10-2 0 1 1 0 002 0zM9 9a1 1 0 000 2h.25v2H9a1 1 0 100 2h2.5a1 1 0 100-2h-.25v-3A1 1 0 0010.25 9H9z"
      clipRule="evenodd"
    />
  ),
};

export function Banner({
  kind,
  children,
  className = "",
}: {
  kind: "error" | "success" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg px-3.5 py-2.5 text-sm ${STYLES[kind]} ${className}`}
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        {ICONS[kind]}
      </svg>
      <span>{children}</span>
    </p>
  );
}
