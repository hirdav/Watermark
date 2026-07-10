import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, PlanName } from "@/lib/plans";
import { UpgradeButton } from "./UpgradeButton";

const TIERS: PlanName[] = ["FREE", "PRO", "STUDIO"];

export default async function PricingPage() {
  const session = await auth();
  const user = session?.user
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Simple, honest pricing
        </h1>
        <p className="mt-3 text-zinc-500">Start free. Upgrade when you need your own logo, more images, or more projects.</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const plan = PLANS[tier];
          const isCurrent = user?.plan === tier;
          const isPopular = tier === "PRO";

          return (
            <div
              key={tier}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                isPopular
                  ? "border-zinc-900 bg-white shadow-lg dark:border-zinc-50 dark:bg-zinc-900"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{plan.label}</h2>
              <p className="mt-2">
                <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {plan.priceINR ? `₹${plan.priceINR}` : "Free"}
                </span>
                {plan.priceINR && <span className="text-sm font-normal text-zinc-500">/mo</span>}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                {[
                  `${plan.maxProjects === Infinity ? "Unlimited" : plan.maxProjects} active project${plan.maxProjects === 1 ? "" : "s"}`,
                  `${plan.maxImagesPerMonth === Infinity ? "Unlimited" : plan.maxImagesPerMonth} images / month`,
                  plan.customWatermark ? "Your own logo or text watermark" : "Default watermark",
                  plan.customWatermark ? "Full placement control + saved templates" : "Fixed placement",
                  "Private client gallery with favorites",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <span className="block rounded-lg bg-zinc-100 px-4 py-2.5 text-center text-sm font-medium text-zinc-500 dark:bg-zinc-800">
                    Current plan
                  </span>
                ) : tier === "FREE" ? (
                  <Link
                    href={user ? "/dashboard" : "/signup"}
                    className="block rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
                  >
                    {user ? "Go to dashboard" : "Sign up free"}
                  </Link>
                ) : user ? (
                  <UpgradeButton plan={tier as "PRO" | "STUDIO"} label={plan.label} />
                ) : (
                  <Link
                    href="/signup"
                    className="block rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Sign up to subscribe
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-sm text-zinc-500">
        Questions about a plan?{" "}
        <Link href="/contact" className="font-medium text-zinc-900 underline dark:text-zinc-50">
          Contact us
        </Link>
        .
      </p>
    </div>
  );
}
