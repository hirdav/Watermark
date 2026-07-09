export function TrustNote() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-400 dark:text-zinc-600">
      <span className="flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
        Encrypted in transit (HTTPS)
      </span>
      <span className="flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
        Passwords are hashed, never stored in plain text
      </span>
      <span className="flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a1 1 0 01.894.553l1.382 2.764 3.05.443a1 1 0 01.555 1.706l-2.208 2.152.521 3.038a1 1 0 01-1.451 1.054L10 12.347l-2.743 1.363a1 1 0 01-1.451-1.054l.521-3.038-2.208-2.152a1 1 0 01.555-1.706l3.05-.443L9.106 2.553A1 1 0 0110 2z" />
        </svg>
        We never sell your photos or client data
      </span>
    </div>
  );
}
