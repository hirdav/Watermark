"use client";

import { useEffect } from "react";
import Link from "next/link";
import { UpgradeButton } from "@/app/(marketing)/pricing/UpgradeButton";

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  /** Plan the signed-in user is currently on, so we don't offer to "upgrade" to it. */
  currentPlan?: "FREE" | "PRO" | "STUDIO";
  /** Optional context line explaining what triggered the modal. */
  reason?: string;
}

/** Feature comparison — a table shows what staying on Free means giving up. */
const ROWS: { label: string; free: string | boolean; pro: string | boolean; studio: string | boolean }[] = [
  { label: "Active projects", free: "2", pro: "Unlimited", studio: "Unlimited" },
  { label: "Images per month", free: "20", pro: "500", studio: "Unlimited" },
  { label: "Your own logo or text watermark", free: false, pro: true, studio: true },
  { label: "Placement control + saved templates", free: false, pro: true, studio: true },
  { label: "Client gallery with favorites", free: true, pro: true, studio: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "string") return <>{value}</>;
  return value ? (
    <svg className="mx-auto h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  ) : (
    <span className="text-zinc-300 dark:text-zinc-600">—</span>
  );
}

export function PricingModal({ open, onClose, currentPlan, reason }: PricingModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const proCellCls = "bg-zinc-50 dark:bg-zinc-800/60";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>

        <h2 className="pr-8 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Put your own brand on every photo you send
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500">
          {reason || "Your logo or studio name, placed exactly how you want — on every proof your clients see."}
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-[38%] pb-3" />
                <th className="pb-3 text-center font-normal">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Free</span>
                  <span className="mt-1 block text-base font-semibold text-zinc-900 dark:text-zinc-50">₹0</span>
                  {currentPlan === "FREE" && (
                    <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
                      Your plan
                    </span>
                  )}
                </th>
                <th className={`rounded-t-xl pb-3 pt-3 text-center font-normal ${proCellCls}`}>
                  <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-[10px] font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
                    Most popular
                  </span>
                  <span className="mt-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-50">Pro</span>
                  <span className="mt-1 block text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    ₹999<span className="text-xs font-normal text-zinc-500">/mo</span>
                  </span>
                  <span className="block text-[11px] font-normal text-zinc-500">about ₹33 a day</span>
                </th>
                <th className="pb-3 text-center font-normal">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Studio</span>
                  <span className="mt-1 block text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    ₹2999<span className="text-xs font-normal text-zinc-500">/mo</span>
                  </span>
                  <span className="block text-[11px] font-normal text-zinc-500">about ₹100 a day</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-2.5 pr-3 text-zinc-600 dark:text-zinc-400">{row.label}</td>
                  <td className="py-2.5 text-center text-zinc-600 dark:text-zinc-400">
                    <Cell value={row.free} />
                  </td>
                  <td className={`py-2.5 text-center font-medium text-zinc-900 dark:text-zinc-50 ${proCellCls}`}>
                    <Cell value={row.pro} />
                  </td>
                  <td className="py-2.5 text-center text-zinc-600 dark:text-zinc-400">
                    <Cell value={row.studio} />
                  </td>
                </tr>
              ))}
              <tr className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="pt-4" />
                <td className="pt-4 text-center align-top">
                  {currentPlan === "FREE" && <span className="text-xs text-zinc-400">Current plan</span>}
                </td>
                <td className={`rounded-b-xl px-3 pb-3 pt-4 align-top ${proCellCls}`}>
                  {currentPlan === "PRO" ? (
                    <span className="block text-center text-xs text-zinc-400">Current plan</span>
                  ) : (
                    <UpgradeButton plan="PRO" label="Pro" cta="Unlock Pro" />
                  )}
                </td>
                <td className="px-3 pt-4 align-top">
                  {currentPlan === "STUDIO" ? (
                    <span className="block text-center text-xs text-zinc-400">Current plan</span>
                  ) : (
                    <UpgradeButton plan="STUDIO" label="Studio" cta="Unlock Studio" />
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
          No commitment — cancel anytime.
        </p>
        <p className="mt-1 text-center text-xs text-zinc-500">
          If you cancel, you keep your plan until the end of the billing period.{" "}
          <Link href="/pricing" className="underline" onClick={onClose}>
            See full plan details
          </Link>
        </p>
      </div>
    </div>
  );
}
