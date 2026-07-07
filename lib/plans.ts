export type PlanName = "FREE" | "PRO" | "STUDIO";

export interface PlanConfig {
  label: string;
  maxShoots: number;
  maxImagesPerMonth: number;
  customWatermarkText: boolean;
  priceINR: number | null;
  razorpayPlanId: string | null;
}

export const PLANS: Record<PlanName, PlanConfig> = {
  FREE: {
    label: "Free",
    maxShoots: 1,
    maxImagesPerMonth: 20,
    customWatermarkText: false,
    priceINR: null,
    razorpayPlanId: null,
  },
  PRO: {
    label: "Pro",
    maxShoots: Infinity,
    maxImagesPerMonth: 500,
    customWatermarkText: true,
    priceINR: 999,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ID_PRO || null,
  },
  STUDIO: {
    label: "Studio",
    maxShoots: Infinity,
    maxImagesPerMonth: Infinity,
    customWatermarkText: true,
    priceINR: 2999,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ID_STUDIO || null,
  },
};

export function startOfCurrentBillingPeriod(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
