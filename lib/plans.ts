export type PlanName = "FREE" | "PRO" | "STUDIO";

export interface PlanConfig {
  label: string;
  maxProjects: number;
  maxImagesPerMonth: number;
  customWatermark: boolean;
  priceINR: number | null;
  razorpayPlanId: string | null;
}

export const PLANS: Record<PlanName, PlanConfig> = {
  FREE: {
    label: "Free",
    maxProjects: 2,
    maxImagesPerMonth: 20,
    customWatermark: false,
    priceINR: null,
    razorpayPlanId: null,
  },
  PRO: {
    label: "Pro",
    maxProjects: Infinity,
    maxImagesPerMonth: 500,
    customWatermark: true,
    priceINR: 999,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ID_PRO || null,
  },
  STUDIO: {
    label: "Studio",
    maxProjects: Infinity,
    maxImagesPerMonth: Infinity,
    customWatermark: true,
    priceINR: 2999,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ID_STUDIO || null,
  },
};

/** Minimum plan required for watermark customization (logo/text, placement, templates). */
export const CUSTOM_WATERMARK_MIN_PLAN: PlanName = "PRO";

export function startOfCurrentBillingPeriod(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
