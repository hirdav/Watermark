"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteProjectButton({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${projectTitle}"? This permanently removes all its photos and the client gallery link. This can't be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert("Could not delete project");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Could not delete project");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label={`Delete ${projectTitle}`}
      title="Delete project"
      className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482 41.03 41.03 0 00-2.365-.298V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
