"use client";

import { useState } from "react";
import { PhotoViewer, type PhotoViewerItem } from "@/components/ui/PhotoViewer";

interface GalleryImage {
  id: string;
  selected: boolean;
  feedback: string | null;
}

export function GalleryGrid({ token, images: initialImages }: { token: string; images: GalleryImage[] }) {
  const [images, setImages] = useState(initialImages);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [savingFeedbackId, setSavingFeedbackId] = useState<string | null>(null);
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);

  const favoriteCount = images.filter((i) => i.selected).length;

  async function submitFeedback(id: string, draft: string) {
    const feedback = draft.trim();
    setSavingFeedbackId(id);
    try {
      const res = await fetch(`/api/gallery/${token}/feedback`, {
        method: "POST",
        body: new URLSearchParams({ imageId: id, feedback }),
      });
      if (!res.ok) throw new Error("request failed");
      const body = await res.json();
      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, feedback: body.feedback } : img)));
      setSavedFeedbackId(id);
      setTimeout(() => setSavedFeedbackId((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      // Leave the draft in place so the client can retry.
    } finally {
      setSavingFeedbackId(null);
    }
  }

  async function toggleFavorite(id: string) {
    // Optimistic update — flip immediately, reconcile with the server in the background.
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, selected: !img.selected } : img)));
    setPoppingId(id);
    setTimeout(() => setPoppingId((cur) => (cur === id ? null : cur)), 400);

    try {
      const res = await fetch(`/api/gallery/${token}/select`, {
        method: "POST",
        body: new URLSearchParams({ imageId: id }),
      });
      if (!res.ok) throw new Error("request failed");
      const body = await res.json();
      // Reconcile with the server's actual value in case of a race.
      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, selected: body.selected } : img)));
    } catch {
      // Revert on failure.
      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, selected: !img.selected } : img)));
    }
  }

  const viewerItems: PhotoViewerItem[] = images.map((img) => ({
    id: img.id,
    src: `/api/gallery/${token}/images/${img.id}`,
    selected: img.selected,
  }));

  return (
    <>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Tap a photo to view it, or use the favorite button to shortlist it
          {favoriteCount > 0 && (
            <>
              {" "}
              — <span className="font-medium text-amber-600 dark:text-amber-500">{favoriteCount} favorited</span>
            </>
          )}
          .
        </p>
        {images.length > 0 && (
          <a
            href={`/api/gallery/${token}/download`}
            className="shrink-0 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {favoriteCount > 0 ? `Download ${favoriteCount} favorited` : "Download all"}
          </a>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, i) => (
          <div
            key={image.id}
            className={`group overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-zinc-900 ${
              image.selected
                ? "border-amber-400 ring-2 ring-amber-400/40"
                : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            }`}
          >
            <button
              type="button"
              onClick={() => setViewerIndex(i)}
              className="relative block w-full cursor-zoom-in"
              aria-label="View photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/gallery/${token}/images/${image.id}`}
                alt=""
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {image.selected && (
                <span
                  className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-white shadow ${
                    poppingId === image.id ? "animate-favorite-pop" : ""
                  }`}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 2a1 1 0 01.894.553l1.382 2.764 3.05.443a1 1 0 01.555 1.706l-2.208 2.152.521 3.038a1 1 0 01-1.451 1.054L10 12.347l-2.743 1.363a1 1 0 01-1.451-1.054l.521-3.038-2.208-2.152a1 1 0 01.555-1.706l3.05-.443L9.106 2.553A1 1 0 0110 2z" />
                  </svg>
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(image.id)}
              className={`flex w-full items-center justify-center gap-1.5 border-t border-zinc-100 py-2.5 text-sm font-medium transition-colors dark:border-zinc-800 ${
                image.selected
                  ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <span className={poppingId === image.id ? "inline-block animate-favorite-pop" : "inline-block"}>
                {image.selected ? "★ Favorited" : "☆ Favorite"}
              </span>
            </button>
            <div className="border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
              <textarea
                value={feedbackDrafts[image.id] ?? image.feedback ?? ""}
                onChange={(e) => setFeedbackDrafts((prev) => ({ ...prev, [image.id]: e.target.value }))}
                placeholder="Leave feedback on this photo…"
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-green-600 dark:text-green-500">
                  {savedFeedbackId === image.id ? "Saved ✓" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => submitFeedback(image.id, feedbackDrafts[image.id] ?? image.feedback ?? "")}
                  disabled={savingFeedbackId === image.id}
                  className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  {savingFeedbackId === image.id ? "Saving…" : "Send feedback"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.969zM12 7a1 1 0 11-2 0 1 1 0 012 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">No photos yet</p>
          <p className="text-sm text-zinc-500">Check back once the photographer uploads this project.</p>
        </div>
      )}

      <PhotoViewer
        items={viewerItems}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onNavigate={setViewerIndex}
        renderActions={(item) => (
          <button
            type="button"
            onClick={() => toggleFavorite(item.id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              item.selected ? "bg-amber-400 text-white" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <span className={poppingId === item.id ? "inline-block animate-favorite-pop" : "inline-block"}>
              {item.selected ? "★ Favorited" : "☆ Favorite"}
            </span>
          </button>
        )}
      />
    </>
  );
}
