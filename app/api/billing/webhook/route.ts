import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { PlanName } from "@/lib/plans";
import { verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { subscription?: { entity?: Record<string, unknown> } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const subscriptionEntity = event.payload?.subscription?.entity;
  if (!subscriptionEntity) {
    return NextResponse.json({ received: true });
  }

  const razorpaySubscriptionId = subscriptionEntity.id as string;
  const status = subscriptionEntity.status as string;
  const notes = subscriptionEntity.notes as Record<string, string> | undefined;
  const userId = notes?.userId;
  const plan = notes?.plan as PlanName | undefined;
  const currentPeriodEnd = subscriptionEntity.current_end
    ? new Date((subscriptionEntity.current_end as number) * 1000)
    : undefined;

  if (!userId || !plan) {
    return NextResponse.json({ received: true });
  }

  await prisma.subscription.upsert({
    where: { userId },
    update: { razorpaySubscriptionId, status, plan, currentPeriodEnd },
    create: { userId, razorpaySubscriptionId, status, plan, currentPeriodEnd },
  });

  const eventType = event.event;
  if (eventType === "subscription.activated" || eventType === "subscription.charged") {
    await prisma.user.update({ where: { id: userId }, data: { plan } });
  } else if (eventType === "subscription.cancelled" || eventType === "subscription.halted") {
    await prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } });
  }

  return NextResponse.json({ received: true });
}
