"use client";

import { useEffect, useRef, useState } from "react";

const POSITIONS = [
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

interface WatermarkSettingsProps {
  shootId: string;
  allowed: boolean;
  initial: {
    type: "TEXT" | "LOGO";
    text: string;
    hasLogo: boolean;
    position: string;
    sizePercent: number;
    opacityPercent: number;
    rotation: number;
    marginPercent: number;
  };
}

export function WatermarkSettings({ shootId, allowed, initial }: WatermarkSettingsProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState(initial.type);
  const [sizePercent, setSizePercent] = useState(initial.sizePercent);
  const [opacityPercent, setOpacityPercent] = useState(initial.opacityPercent);
  const [rotation, setRotation] = useState(initial.rotation);
  const [marginPercent, setMarginPercent] = useState(initial.marginPercent);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function schedulePreview() {
    if (!allowed) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!formRef.current) return;
      setPreviewLoading(true);
      try {
        const body = new FormData(formRef.current);
        const res = await fetch(`/api/shoots/${shootId}/watermark-preview`, { method: "POST", body });
        if (!res.ok) return;
        const blob = await res.blob();
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } finally {
        setPreviewLoading(false);
      }
    }, 300);
  }

  useEffect(() => {
    schedulePreview();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!allowed) {
    return (
      <div className="mt-6 rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
        Your photos are watermarked with a fixed default mark. Upgrade to Pro or Studio to use your own logo or
        text, with custom position, size, opacity, rotation, and margin.
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={`/api/shoots/${shootId}/watermark-config`}
      method="POST"
      encType="multipart/form-data"
      className="mt-6 rounded-md border border-zinc-300 p-4 dark:border-zinc-700"
    >
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Watermark settings</h2>

      <div className="mt-3 flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="type"
            value="text"
            checked={type === "TEXT"}
            onChange={() => {
              setType("TEXT");
              schedulePreview();
            }}
          />
          Text
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="type"
            value="logo"
            checked={type === "LOGO"}
            onChange={() => {
              setType("LOGO");
              schedulePreview();
            }}
          />
          Logo (transparent PNG)
        </label>
      </div>

      {type === "TEXT" ? (
        <input
          type="text"
          name="text"
          defaultValue={initial.text}
          onChange={schedulePreview}
          placeholder="Watermark text"
          className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      ) : (
        <div className="mt-3">
          <input
            type="file"
            name="logo"
            accept="image/png"
            onChange={schedulePreview}
            className="text-sm"
          />
          {initial.hasLogo && (
            <p className="mt-1 text-xs text-zinc-500">A logo is already saved — pick a new file only to replace it.</p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <label className="text-xs text-zinc-500">
          Position
          <select
            name="position"
            defaultValue={initial.position}
            onChange={schedulePreview}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {POSITIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-zinc-500">
          Size ({sizePercent}%)
          <input
            type="range"
            name="sizePercent"
            min={5}
            max={80}
            value={sizePercent}
            onChange={(e) => {
              setSizePercent(Number(e.target.value));
              schedulePreview();
            }}
            className="mt-2 w-full"
          />
        </label>

        <label className="text-xs text-zinc-500">
          Opacity ({opacityPercent}%)
          <input
            type="range"
            name="opacity"
            min={5}
            max={100}
            value={opacityPercent}
            onChange={(e) => {
              setOpacityPercent(Number(e.target.value));
              schedulePreview();
            }}
            className="mt-2 w-full"
          />
        </label>

        <label className="text-xs text-zinc-500">
          Rotation ({rotation}°)
          <input
            type="range"
            name="rotation"
            min={-180}
            max={180}
            value={rotation}
            onChange={(e) => {
              setRotation(Number(e.target.value));
              schedulePreview();
            }}
            className="mt-2 w-full"
          />
        </label>

        <label className="text-xs text-zinc-500">
          Margin from edge ({marginPercent}%)
          <input
            type="range"
            name="marginPercent"
            min={0}
            max={20}
            value={marginPercent}
            onChange={(e) => {
              setMarginPercent(Number(e.target.value));
              schedulePreview();
            }}
            className="mt-2 w-full"
          />
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Watermark preview" className="max-h-80 w-full object-contain" />
        ) : (
          <p className="p-6 text-center text-sm text-zinc-500">{previewLoading ? "Rendering preview…" : "Preview"}</p>
        )}
      </div>

      <button
        type="submit"
        className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
      >
        Save watermark settings
      </button>
    </form>
  );
}
