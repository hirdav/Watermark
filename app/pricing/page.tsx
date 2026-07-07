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
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-center text-3xl font-semibold text-zinc-900 dark:text-zinc-50">Pricing</h1>
      <p className="mt-2 text-center text-sm text-zinc-500">
        Every plan includes the invisible, forensic watermark.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const plan = PLANS[tier];
          const isCurrent = user?.plan === tier;

          return (
            <div key={tier} className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{plan.label}</h2>
              <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                {plan.priceINR ? `₹${plan.priceINR}` : "Free"}
                {plan.priceINR && <span className="text-sm font-normal text-zinc-500">/mo</span>}
              </p>
              <ul className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>{plan.maxShoots === Infinity ? "Unlimited" : plan.maxShoots} active shoot(s)</li>
                <li>{plan.maxImagesPerMonth === Infinity ? "Unlimited" : plan.maxImagesPerMonth} images / month</li>
                <li>{plan.customWatermarkText ? "Custom watermark text" : "Default watermark text"}</li>
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <span className="block rounded-md bg-zinc-100 px-4 py-2 text-center text-sm font-medium text-zinc-500 dark:bg-zinc-800">
                    Current plan
                  </span>
                ) : tier === "FREE" ? (
                  <Link
                    href={user ? "/dashboard" : "/signup"}
                    className="block rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  >
                    {user ? "Go to dashboard" : "Sign up free"}
                  </Link>
                ) : user ? (
                  <UpgradeButton plan={tier as "PRO" | "STUDIO"} label={plan.label} />
                ) : (
                  <Link
                    href="/signup"
                    className="block rounded-md bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    Sign up to subscribe
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
