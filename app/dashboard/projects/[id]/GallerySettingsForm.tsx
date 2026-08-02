"use client";

import { useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-50/10";
const secondaryBtn =
  "rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900";
const primaryBtn =
  "rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

interface GallerySettingsFormProps {
  projectId: string;
  shareToken: string;
  initial: {
    clientName: string;
    welcomeMessage: string;
    studioName: string;
    hasStudioLogo: boolean;
  };
}

export function GallerySettingsForm({ projectId, shareToken, initial }: GallerySettingsFormProps) {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState(initial.clientName);
  const [welcomeMessage, setWelcomeMessage] = useState(initial.welcomeMessage);
  const [studioName, setStudioName] = useState(initial.studioName);
  const [hasStudioLogo, setHasStudioLogo] = useState(initial.hasStudioLogo);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.set("clientName", clientName);
      fd.set("welcomeMessage", welcomeMessage);
      fd.set("studioName", studioName);
      if (logoFile) fd.set("studioLogo", logoFile);
      const res = await fetch(`/api/projects/${projectId}/gallery-settings`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok || body.error) {
        setNotice({ kind: "error", text: body.error ?? "Could not save gallery settings" });
        return;
      }
      setHasStudioLogo(body.hasStudioLogo);
      setLogoFile(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      setNotice({ kind: "ok", text: "Saved — your client will see this the next time they open the gallery." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Personalize the client gallery</span>
        <span className="text-xs text-zinc-500">{open ? "Hide" : "Edit"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          {notice && (
            <Banner kind={notice.kind === "ok" ? "success" : "error"} className="mb-4">
              {notice.text}
            </Banner>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Client name</span>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Sarah & Tom"
                maxLength={100}
                className={`${inputCls} mt-1.5`}
              />
              <span className="mt-1 block text-xs text-zinc-400">Shown as “Welcome, {clientName || "…"}” at the top of the gallery.</span>
            </label>

            <label className="block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Studio name</span>
              <input
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="e.g. Golden Hour Photography"
                maxLength={100}
                className={`${inputCls} mt-1.5`}
              />
              <span className="mt-1 block text-xs text-zinc-400">Replaces the default logo in the gallery header.</span>
            </label>
          </div>

          <label className="mt-4 block text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Welcome message</span>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Thank you for choosing us! Tap ☆ to shortlist your favorites…"
              rows={3}
              maxLength={500}
              className={`${inputCls} mt-1.5 resize-none`}
            />
          </label>

          <div className="mt-4">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Studio logo</span>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              {hasStudioLogo && !logoFile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/gallery/${shareToken}/studio-logo`} alt="Studio logo" className="h-8 w-auto rounded border border-zinc-200 dark:border-zinc-700" />
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
              <button type="button" onClick={() => logoInputRef.current?.click()} className={secondaryBtn}>
                {hasStudioLogo || logoFile ? "Choose a different PNG" : "Choose PNG file"}
              </button>
              {logoFile && <span className="max-w-40 truncate text-xs text-zinc-500">{logoFile.name}</span>}
            </div>
          </div>

          <button type="button" onClick={save} disabled={saving} className={`${primaryBtn} mt-4`}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
