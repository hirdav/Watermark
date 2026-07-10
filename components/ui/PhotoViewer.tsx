"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PhotoViewerItem {
  id: string;
  src: string;
  alt?: string;
  filename?: string;
  selected?: boolean;
}

interface PhotoViewerProps {
  items: PhotoViewerItem[];
  /** null/undefined closes the viewer. */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  /** Renders extra controls (e.g. a favorite toggle or download link) in the viewer's footer. */
  renderActions?: (item: PhotoViewerItem) => React.ReactNode;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP_DOUBLE_CLICK = 2.5;
const SWIPE_THRESHOLD = 60;
const TRANSITION_MS = 200;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function PhotoViewer({ items, index, onClose, onNavigate, renderActions }: PhotoViewerProps) {
  const open = index !== null && index >= 0 && index < items.length;
  const [mounted, setMounted] = useState(open);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lastIndex, setLastIndex] = useState(index);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; tx0: number; ty0: number; dx: number } | null>(null);

  const item = open ? items[index as number] : null;

  // Mount immediately on open (adjusted during render, per React's guidance for
  // deriving state from props rather than doing it in an Effect).
  if (open && !mounted) {
    setMounted(true);
  }

  // Reset zoom/pan whenever the shown image changes — same render-time-adjustment
  // pattern, comparing against the last-seen index instead of a `useEffect`.
  if (index !== lastIndex) {
    setLastIndex(index);
    setScale(1);
    setTx(0);
    setTy(0);
  }

  const resetZoom = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const wrapped = ((next % items.length) + items.length) % items.length;
      resetZoom();
      onNavigate(wrapped);
    },
    [items.length, onNavigate, resetZoom]
  );

  const goNext = useCallback(() => {
    if (index !== null) goTo(index + 1);
  }, [goTo, index]);
  const goPrev = useCallback(() => {
    if (index !== null) goTo(index - 1);
  }, [goTo, index]);

  // Delay unmounting until the close transition finishes.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Lock body scroll + keyboard shortcuts while open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, goNext, goPrev]);

  // Wheel-to-zoom needs a non-passive native listener to preventDefault.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(s - e.deltaY * 0.0015, ZOOM_MIN, ZOOM_MAX));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  function handleDoubleClick() {
    setScale((s) => (s > 1 ? 1 : ZOOM_STEP_DOUBLE_CLICK));
    setTx(0);
    setTy(0);
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragRef.current = { x: e.clientX, y: e.clientY, tx0: tx, ty0: ty, dx: 0 };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current.dx = dx;
    if (scale > 1) {
      setTx(dragRef.current.tx0 + dx);
      setTy(dragRef.current.ty0 + dy);
    }
  }

  function handlePointerUp() {
    const drag = dragRef.current;
    setDragging(false);
    dragRef.current = null;
    if (drag && scale === 1 && Math.abs(drag.dx) > SWIPE_THRESHOLD) {
      if (drag.dx < 0) goNext();
      else goPrev();
    }
  }

  if (!mounted || !item) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col transition-opacity ease-out ${
        open ? "opacity-100" : "opacity-0"
      }`}
      style={{ transitionDuration: `${TRANSITION_MS}ms` }}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      <div className="relative z-10 flex items-center justify-between px-4 py-3 text-white/90">
        <span className="text-xs font-medium tabular-nums">
          {(index as number) + 1} / {items.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-4"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {items.length > 1 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous photo"
            className="absolute left-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50 sm:left-4"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={item.id}
          src={item.src}
          alt={item.alt ?? ""}
          draggable={false}
          onDoubleClick={handleDoubleClick}
          className={`max-h-full max-w-full select-none object-contain transition-transform ease-out ${
            open ? "scale-100 opacity-100" : "scale-95 opacity-0"
          } ${scale > 1 ? "cursor-grab" : "cursor-zoom-in"} ${dragging ? "cursor-grabbing" : ""}`}
          style={{
            transitionDuration: dragging ? "0ms" : `${TRANSITION_MS}ms`,
            transform: `scale(${scale}) translate(${tx / scale}px, ${ty / scale}px)`,
          }}
        />

        {items.length > 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Next photo"
            className="absolute right-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50 sm:right-4"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-center gap-4 px-4 py-3">
        {item.filename && <span className="truncate text-xs text-white/60">{item.filename}</span>}
        {renderActions?.(item)}
      </div>
    </div>
  );
}
