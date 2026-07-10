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

const TIERS = [
  {
    key: "FREE" as const,
    label: "Free",
    price: null,
    features: ["2 active projects", "20 images / month", "Default watermark", "Private client gallery with favorites"],
  },
  {
    key: "PRO" as const,
    label: "Pro",
    price: 999,
    popular: true,
    features: [
      "Unlimited active projects",
      "500 images / month",
      "Your own logo or text watermark",
      "Full placement control + saved templates",
      "Private client gallery with favorites",
    ],
  },
  {
    key: "STUDIO" as const,
    label: "Studio",
    price: 2999,
    features: [
      "Unlimited active projects",
      "Unlimited images / month",
      "Your own logo or text watermark",
      "Full placement control + saved templates",
      "Private client gallery with favorites",
    ],
  },
];

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
          Upgrade to unlock this feature
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500">
          {reason || "This feature requires the Pro or Studio plan."}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const isCurrent = currentPlan === tier.key;
            return (
              <div
                key={tier.key}
                className={`relative flex flex-col rounded-xl border p-4 ${
                  tier.popular
                    ? "border-zinc-900 dark:border-zinc-50"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[10px] font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
                    Most popular
                  </span>
                )}
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{tier.label}</h3>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {tier.price ? `₹${tier.price}` : "Free"}
                  {tier.price && <span className="text-xs font-normal text-zinc-500">/mo</span>}
                </p>
                <ul className="mt-3 flex-1 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <svg className="mt-0.5 h-3 w-3 shrink-0 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <span className="block rounded-lg bg-zinc-100 px-3 py-2 text-center text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                      Current plan
                    </span>
                  ) : tier.key === "FREE" ? (
                    <span className="block rounded-lg border border-zinc-200 px-3 py-2 text-center text-xs font-medium text-zinc-400 dark:border-zinc-800">
                      —
                    </span>
                  ) : (
                    <UpgradeButton plan={tier.key} label={tier.label} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-center text-xs text-zinc-500">
          <Link href="/pricing" className="underline" onClick={onClose}>
            See full plan comparison
          </Link>
        </p>
      </div>
    </div>
  );
}
