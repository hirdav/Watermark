"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { PricingModal } from "@/components/ui/PricingModal";
import { PhotoViewer, type PhotoViewerItem } from "@/components/ui/PhotoViewer";

const SINGLE_POSITIONS = [
  ["TOP_LEFT", "Top left"],
  ["TOP_CENTER", "Top center"],
  ["TOP_RIGHT", "Top right"],
  ["MIDDLE_LEFT", "Middle left"],
  ["CENTER", "Center"],
  ["MIDDLE_RIGHT", "Middle right"],
  ["BOTTOM_LEFT", "Bottom left"],
  ["BOTTOM_CENTER", "Bottom center"],
  ["BOTTOM_RIGHT", "Bottom right"],
] as const;

export interface TemplateDto {
  id: string;
  name: string;
  type: "TEXT" | "LOGO";
  text: string;
  hasLogo: boolean;
  mode: "SINGLE" | "TILED";
  position: string;
  posXPct: number;
  posYPct: number;
  sizePct: number;
  opacityPct: number;
  rotation: number;
  marginPct: number;
}

export interface ImageDto {
  id: string;
  filename: string;
  selected: boolean;
}

interface ProjectWizardProps {
  projectId: string;
  allowed: boolean;
  templates: TemplateDto[];
  images: ImageDto[];
  initial: {
    type: "TEXT" | "LOGO";
    text: string;
    hasLogo: boolean;
    mode: "SINGLE" | "TILED";
    position: string;
    posX: number;
    posY: number;
    sizePercent: number;
    opacityPercent: number;
    rotation: number;
    marginPercent: number;
  };
}

const STEPS = [
  { n: 1, label: "Watermark" },
  { n: 2, label: "Customize" },
  { n: 3, label: "Upload" },
  { n: 4, label: "Download" },
];

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50/10";
const chipCls = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
      : "border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300"
  }`;
const primaryBtn =
  "rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";
const secondaryBtn =
  "rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900";
const cardCls =
  "w-full rounded-xl border border-zinc-300 p-5 text-left shadow-sm transition-all hover:border-zinc-500 hover:shadow-md dark:border-zinc-700 dark:hover:border-zinc-400";

function ProBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      Pro
    </span>
  );
}

/** Invisible full-cover button that intercepts clicks on a locked control and opens the upgrade modal instead. */
function LockOverlay({ onClick, label = "Upgrade to unlock" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute inset-0 z-10 cursor-pointer rounded-[inherit]"
    />
  );
}

export function ProjectWizard({ projectId, allowed, templates: initialTemplates, images: initialImages, initial }: ProjectWizardProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [lastInitialImages, setLastInitialImages] = useState(initialImages);
  // Resync when the server hands us fresh data (e.g. after router.refresh()
  // post-upload) — adjusted during render rather than an Effect, same pattern
  // as PhotoViewer's index-change reset.
  if (initialImages !== lastInitialImages) {
    setLastInitialImages(initialImages);
    setImages(initialImages);
  }
  const [step, setStep] = useState(images.length > 0 ? 4 : 1);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const openUpgrade = useCallback(() => setPricingModalOpen(true), []);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Watermark state
  const [type, setType] = useState<"TEXT" | "LOGO">(initial.type);
  const [text, setText] = useState(initial.text);
  const [mode, setMode] = useState<"single" | "tiled">(initial.mode === "TILED" ? "tiled" : "single");
  const [position, setPosition] = useState(initial.position);
  const [posX, setPosX] = useState(initial.posX);
  const [posY, setPosY] = useState(initial.posY);
  const [size, setSize] = useState(initial.sizePercent);
  const [opacity, setOpacity] = useState(initial.opacityPercent);
  const [rotation, setRotation] = useState(initial.rotation);
  const [margin, setMargin] = useState(initial.marginPercent);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState(initialTemplates);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasLogoSource = !!logoFile || !!templateId || initial.hasLogo;

  const buildFormData = useCallback(() => {
    const fd = new FormData();
    fd.set("type", type === "LOGO" ? "logo" : "text");
    fd.set("text", text);
    fd.set("mode", mode);
    fd.set("position", position);
    fd.set("posX", String(posX));
    fd.set("posY", String(posY));
    fd.set("sizePercent", String(size));
    fd.set("opacity", String(opacity));
    fd.set("rotation", String(rotation));
    fd.set("marginPercent", String(margin));
    if (logoFile) fd.set("logo", logoFile);
    if (templateId) fd.set("templateId", templateId);
    return fd;
  }, [type, text, mode, position, posX, posY, size, opacity, rotation, margin, logoFile, templateId]);

  // Live preview, debounced
  useEffect(() => {
    if (!allowed || step !== 2) return;
    if (type === "LOGO" && !hasLogoSource) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/watermark-preview`, {
          method: "POST",
          body: buildFormData(),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } finally {
        setPreviewLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [allowed, step, projectId, buildFormData, type, hasLogoSource]);

  function applyTemplate(t: TemplateDto) {
    if (!allowed) {
      openUpgrade();
      return;
    }
    setType(t.type);
    setText(t.text);
    setMode(t.mode === "TILED" ? "tiled" : "single");
    setPosition(t.position);
    setPosX(t.posXPct);
    setPosY(t.posYPct);
    setSize(t.sizePct);
    setOpacity(t.opacityPct);
    setRotation(t.rotation);
    setMargin(t.marginPct);
    setLogoFile(null);
    setTemplateId(t.hasLogo ? t.id : null);
    setNotice(null);
    setStep(2);
  }

  async function saveTemplate() {
    if (!allowed) {
      openUpgrade();
      return;
    }
    const name = window.prompt("Template name (e.g. “Studio logo, bottom right”):");
    if (!name?.trim()) return;
    const fd = buildFormData();
    fd.set("name", name.trim());
    fd.set("projectId", projectId);
    const res = await fetch("/api/watermark-templates", { method: "POST", body: fd });
    const body = await res.json();
    if (!res.ok) {
      setNotice({ kind: "error", text: body.error ?? "Could not save template" });
      return;
    }
    const list = await fetch("/api/watermark-templates").then((r) => r.json());
    setTemplates(list);
    setNotice({ kind: "ok", text: `Saved template “${name.trim()}”.` });
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/watermark-templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (templateId === id) setTemplateId(null);
  }

  async function deleteImage(id: string) {
    if (!window.confirm("Delete this photo? This removes both the watermarked copy and the original and can't be undone.")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setNotice({ kind: "error", text: "Could not delete photo" });
        return;
      }
      setImages((prev) => prev.filter((img) => img.id !== id));
      setViewerIndex(null);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function saveConfigAndContinue() {
    if (!allowed) {
      openUpgrade();
      return;
    }
    setNotice(null);
    const res = await fetch(`/api/projects/${projectId}/watermark-config`, {
      method: "POST",
      body: buildFormData(),
    });
    const body = await res.json();
    if (!res.ok || body.error) {
      setNotice({ kind: "error", text: body.error ?? "Could not save watermark" });
      return;
    }
    setStep(3);
  }

  function addFiles(incoming: FileList | File[]) {
    const accepted = Array.from(incoming).filter((f) => /\.(jpe?g|png)$/i.test(f.name));
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...accepted.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }

  async function uploadFiles() {
    if (files.length === 0) return;
    setUploading(true);
    setNotice(null);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch(`/api/projects/${projectId}/upload`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok || body.error) {
        setNotice({ kind: "error", text: body.error ?? "Upload failed" });
        return;
      }
      setFiles([]);
      setNotice({
        kind: "ok",
        text: `Watermarked ${body.uploaded} photo(s)${body.skipped ? ` — skipped ${body.skipped} unsupported file(s)` : ""}.`,
      });
      router.refresh();
      setStep(4);
    } finally {
      setUploading(false);
    }
  }

  function handlePreviewClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!allowed || position !== "CUSTOM" || mode !== "single") return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPosX(Math.round(((e.clientX - rect.left) / rect.width) * 100));
    setPosY(Math.round(((e.clientY - rect.top) / rect.height) * 100));
  }

  function canVisit(n: number) {
    if (n === 3) return true;
    if (n === 4) return images.length > 0;
    return true;
  }

  return (
    <div className="mt-6">
      <PricingModal
        open={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        currentPlan={allowed ? undefined : "FREE"}
        reason="Custom watermarks — your own logo or text, full placement control, and saved templates — are available on Pro and Studio."
      />

      {/* Stepper */}
      <ol className="flex items-center gap-1 text-xs sm:gap-2">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && <span className="h-px w-4 bg-zinc-300 dark:bg-zinc-700 sm:w-8" />}
            <button
              type="button"
              disabled={!canVisit(s.n)}
              onClick={() => canVisit(s.n) && setStep(s.n)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium transition-colors disabled:opacity-40 ${
                step === s.n
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                  step === s.n ? "border-current" : "border-zinc-400 dark:border-zinc-600"
                }`}
              >
                {s.n}
              </span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {notice && (
        <Banner kind={notice.kind === "ok" ? "success" : "error"} className="mt-4">
          {notice.text}
        </Banner>
      )}

      {/* Step 1 — choose watermark */}
      {step === 1 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Choose your watermark</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="relative">
              {!allowed && <LockOverlay onClick={openUpgrade} />}
              <button
                type="button"
                className={`${cardCls} ${!allowed ? "opacity-60" : ""}`}
                onClick={() => {
                  setType("TEXT");
                  setTemplateId(null);
                  setStep(2);
                }}
              >
                <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Text watermark
                  {!allowed && <ProBadge />}
                </span>
                <p className="mt-1 text-sm text-zinc-500">Your studio name or any text, styled and placed how you like.</p>
              </button>
            </div>
            <div className="relative">
              {!allowed && <LockOverlay onClick={openUpgrade} />}
              <button
                type="button"
                className={`${cardCls} ${!allowed ? "opacity-60" : ""}`}
                onClick={() => {
                  setType("LOGO");
                  setStep(2);
                }}
              >
                <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  PNG logo
                  {!allowed && <ProBadge />}
                </span>
                <p className="mt-1 text-sm text-zinc-500">Upload a transparent PNG of your logo.</p>
              </button>
            </div>
          </div>

          {templates.length > 0 && (
            <div className="mt-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Or pick a saved template
                {!allowed && <ProBadge />}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {templates.map((t) => (
                  <span
                    key={t.id}
                    className={`inline-flex items-center overflow-hidden rounded-full border border-zinc-300 text-xs dark:border-zinc-700 ${
                      !allowed ? "opacity-60" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="px-3 py-1.5 font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
                    >
                      {t.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete template ${t.name}`}
                      onClick={() => deleteTemplate(t.id)}
                      className="border-l border-zinc-300 px-2 py-1.5 text-zinc-400 hover:text-red-600 dark:border-zinc-700"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {!allowed && (
            <div className="mt-5 rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 dark:border-zinc-700">
              <p>
                On the Free plan your photos get the default <strong>PROOF</strong> watermark.{" "}
                <button type="button" onClick={openUpgrade} className="underline">
                  Upgrade to Pro or Studio
                </button>{" "}
                to use your own logo or text with full customization and templates.
              </p>
              <button type="button" onClick={() => setStep(3)} className={`${primaryBtn} mt-4`}>
                Continue with the default watermark →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — customize */}
      {step === 2 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Customize the watermark</h2>

            {type === "TEXT" ? (
              <div className="relative mt-3">
                {!allowed && <LockOverlay onClick={openUpgrade} />}
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Watermark text"
                  disabled={!allowed}
                  className={`${inputCls} ${!allowed ? "opacity-60" : ""}`}
                />
              </div>
            ) : (
              <div className="relative mt-3 text-sm">
                {!allowed && <LockOverlay onClick={openUpgrade} />}
                <input
                  type="file"
                  accept="image/png"
                  disabled={!allowed}
                  onChange={(e) => {
                    setLogoFile(e.target.files?.[0] ?? null);
                  }}
                  className={`text-sm ${!allowed ? "opacity-60" : ""}`}
                />
                {allowed && !logoFile && (templateId || initial.hasLogo) && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Using the {templateId ? "template’s" : "previously saved"} logo — pick a file only to replace it.
                  </p>
                )}
                {allowed && !hasLogoSource && <p className="mt-1 text-xs text-amber-600">Upload a transparent PNG to continue.</p>}
              </div>
            )}

            <div className="relative mt-5">
              {!allowed && <LockOverlay onClick={openUpgrade} />}
              <div className={!allowed ? "opacity-60" : ""}>
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Placement
                  {!allowed && <ProBadge />}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={chipCls(mode === "tiled" && rotation !== 0)}
                    onClick={() => {
                      setMode("tiled");
                      setRotation(-30);
                    }}
                  >
                    Diagonal pattern
                  </button>
                  <button
                    type="button"
                    className={chipCls(mode === "tiled" && rotation === 0)}
                    onClick={() => {
                      setMode("tiled");
                      setRotation(0);
                    }}
                  >
                    Repeat grid
                  </button>
                  <button
                    type="button"
                    className={chipCls(mode === "single" && position === "CUSTOM")}
                    onClick={() => {
                      setMode("single");
                      setPosition("CUSTOM");
                    }}
                  >
                    Custom (click the preview)
                  </button>
                </div>
                <div className="mt-2 grid w-fit grid-cols-3 gap-1">
                  {SINGLE_POSITIONS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      title={label}
                      aria-label={label}
                      onClick={() => {
                        setMode("single");
                        setPosition(value);
                      }}
                      className={`h-8 w-8 rounded-md border text-[10px] ${
                        mode === "single" && position === value
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                          : "border-zinc-300 text-zinc-400 hover:border-zinc-500 dark:border-zinc-700"
                      }`}
                    >
                      ●
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mt-5">
              {!allowed && <LockOverlay onClick={openUpgrade} />}
              <div className={`grid grid-cols-2 gap-4 ${!allowed ? "opacity-60" : ""}`}>
                <label className="text-xs text-zinc-500">
                  Size ({size}%)
                  <input type="range" min={5} max={80} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-2 w-full" />
                </label>
                <label className="text-xs text-zinc-500">
                  Opacity ({opacity}%)
                  <input type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="mt-2 w-full" />
                </label>
                <label className="text-xs text-zinc-500">
                  Rotation ({rotation}°)
                  <input type="range" min={-180} max={180} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="mt-2 w-full" />
                </label>
                <label className="text-xs text-zinc-500">
                  {mode === "tiled" ? "Spacing" : "Margin from edge"} ({margin}%)
                  <input type="range" min={0} max={20} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="mt-2 w-full" />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => setStep(1)} className={secondaryBtn}>
                ← Back
              </button>
              {allowed ? (
                <>
                  <button type="button" onClick={saveTemplate} className={secondaryBtn} disabled={type === "LOGO" && !hasLogoSource}>
                    Save as template
                  </button>
                  <button
                    type="button"
                    onClick={saveConfigAndContinue}
                    className={primaryBtn}
                    disabled={type === "LOGO" && !hasLogoSource}
                  >
                    Save &amp; continue →
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setStep(3)} className={secondaryBtn}>
                    Skip — use default watermark →
                  </button>
                  <button type="button" onClick={openUpgrade} className={`${primaryBtn} inline-flex items-center gap-1.5`}>
                    Upgrade to customize <ProBadge />
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Live preview{allowed && position === "CUSTOM" && mode === "single" ? " — click to place the watermark" : ""}
            </p>
            <div className="relative mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
              {!allowed ? (
                <div className="flex flex-col items-center gap-3 p-10 text-center">
                  <ProBadge />
                  <p className="text-sm text-zinc-500">Live preview is available on Pro &amp; Studio.</p>
                  <button type="button" onClick={openUpgrade} className={primaryBtn}>
                    Upgrade to preview
                  </button>
                </div>
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Watermark preview"
                  onClick={handlePreviewClick}
                  className={`w-full ${position === "CUSTOM" && mode === "single" ? "cursor-crosshair" : ""}`}
                />
              ) : (
                <p className="p-10 text-center text-sm text-zinc-500">
                  {previewLoading ? "Rendering preview…" : "The preview appears here"}
                </p>
              )}
            </div>
            {allowed && previewLoading && previewUrl && <p className="mt-1 text-xs text-zinc-400">Updating…</p>}
          </div>
        </div>
      )}

      {/* Step 3 — upload */}
      {step === 3 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Upload your photos</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-4 cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              dragOver
                ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-900"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Drag &amp; drop photos here, or click to browse
            </p>
            <p className="mt-1 text-xs text-zinc-500">JPG or PNG — upload a whole batch at once.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {files.map((f) => (
                <li key={`${f.name}:${f.size}`} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800">
                  <span className="max-w-40 truncate">{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                    className="text-zinc-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setStep(2)} className={secondaryBtn}>
              ← Back
            </button>
            <button type="button" onClick={uploadFiles} disabled={files.length === 0 || uploading} className={primaryBtn}>
              {uploading
                ? "Watermarking…"
                : files.length > 0
                  ? `Watermark ${files.length} photo${files.length === 1 ? "" : "s"} →`
                  : "Watermark photos →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — results & download */}
      {step === 4 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your watermarked photos</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStep(3)} className={secondaryBtn}>
                + Upload more
              </button>
              <button type="button" onClick={() => setStep(2)} className={secondaryBtn}>
                Adjust watermark
              </button>
              <a href={`/api/projects/${projectId}/download`} className={primaryBtn}>
                Download all (.zip)
              </a>
            </div>
          </div>

          {images.some((i) => i.selected) && (
            <a
              href={`/api/projects/${projectId}/download-selected`}
              className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
            >
              Download client-selected photos (clean originals)
            </a>
          )}

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((image, i) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="relative">
                  <button type="button" onClick={() => setViewerIndex(i)} className="block w-full cursor-zoom-in" aria-label="View photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/images/${image.id}`} alt={image.filename} className="aspect-square w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteImage(image.id)}
                    disabled={deletingId === image.id}
                    aria-label="Delete photo"
                    title="Delete photo"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482 41.03 41.03 0 00-2.365-.298V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                  <span className="truncate text-zinc-500">{image.filename}</span>
                  <a href={`/api/images/${image.id}`} download={image.filename} className="ml-2 shrink-0 font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                    Save
                  </a>
                </div>
                {image.selected && (
                  <p className="bg-amber-100 px-2 py-1.5 text-center text-xs font-medium text-amber-800">★ Client favorite</p>
                )}
              </div>
            ))}
          </div>
          {images.length === 0 && (
            <div className="mt-14 flex flex-col items-center gap-3 text-center">
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
              <p className="text-sm text-zinc-500">Upload some in the previous step.</p>
            </div>
          )}

          <PhotoViewer
            items={images.map(
              (image): PhotoViewerItem => ({
                id: image.id,
                src: `/api/images/${image.id}`,
                alt: image.filename,
                filename: image.filename,
                selected: image.selected,
              })
            )}
            index={viewerIndex}
            onClose={() => setViewerIndex(null)}
            onNavigate={setViewerIndex}
            renderActions={(item) => (
              <>
                <a
                  href={item.src}
                  download={item.filename}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  Save original
                </a>
                <button
                  type="button"
                  onClick={() => deleteImage(item.id)}
                  disabled={deletingId === item.id}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                >
                  Delete
                </button>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}
