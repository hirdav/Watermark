import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, PlanName } from "@/lib/plans";
import { getRazorpayClient } from "@/lib/razorpay";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed, retryAfterSeconds } = rateLimit(`checkout:${session.user.id}`, 5, 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const plan = body?.plan as PlanName | undefined;
  if (plan !== "PRO" && plan !== "STUDIO") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const planConfig = PLANS[plan];
  if (!planConfig.razorpayPlanId) {
    return NextResponse.json(
      { error: `Billing isn't configured for the ${planConfig.label} plan yet. Set RAZORPAY_PLAN_ID_${plan} in .env.` },
      { status: 500 }
    );
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  const razorpay = getRazorpayClient();
  const subscription = await razorpay.subscriptions.create({
    plan_id: planConfig.razorpayPlanId,
    customer_notify: 1,
    total_count: 120,
    notes: { userId: user.id, plan },
  });

  return NextResponse.json({
    subscriptionId: subscription.id,
    keyId: process.env.RAZORPAY_KEY_ID,
    email: user.email,
  });
}
