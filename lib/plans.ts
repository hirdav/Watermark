export type PlanName = "FREE" | "PRO" | "STUDIO";

export interface PlanConfig {
  label: string;
  maxProjects: number;
  maxImagesPerMonth: number;
  /** Storage cap per individual project, in MB. `Infinity` means unlimited. */
  maxStorageMBPerProject: number;
  customWatermark: boolean;
  priceINR: number | null;
  razorpayPlanId: string | null;
}

export const PLANS: Record<PlanName, PlanConfig> = {
  FREE: {
    label: "Free",
    maxProjects: 2,
    maxImagesPerMonth: 20,
    maxStorageMBPerProject: 200,
    customWatermark: false,
    priceINR: null,
    razorpayPlanId: null,
  },
  PRO: {
    label: "Pro",
    maxProjects: Infinity,
    maxImagesPerMonth: 500,
    maxStorageMBPerProject: 5120,
    customWatermark: true,
    priceINR: 999,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ID_PRO || null,
  },
  STUDIO: {
    label: "Studio",
    maxProjects: Infinity,
    maxImagesPerMonth: Infinity,
    maxStorageMBPerProject: Infinity,
    customWatermark: true,
    priceINR: 2999,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ID_STUDIO || null,
  },
};

/** Human-readable storage limit, e.g. "200 MB" / "5 GB" / "Unlimited". */
export function formatStorageLimit(maxMB: number): string {
  if (maxMB === Infinity) return "Unlimited";
  if (maxMB >= 1024) return `${Math.round((maxMB / 1024) * 10) / 10} GB`;
  return `${maxMB} MB`;
}

/** Minimum plan required for watermark customization (logo/text, placement, templates). */
export const CUSTOM_WATERMARK_MIN_PLAN: PlanName = "PRO";

export function startOfCurrentBillingPeriod(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
