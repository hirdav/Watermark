import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shoots = await prisma.shoot.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { images: true } } },
  });
  return NextResponse.json(shoots);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const planConfig = PLANS[user.plan];
  const shootCount = await prisma.shoot.count({ where: { userId: user.id } });
  if (shootCount >= planConfig.maxShoots) {
    return NextResponse.json(
      {
        error: `Your ${planConfig.label} plan allows up to ${planConfig.maxShoots} active shoot(s). Upgrade to create more.`,
      },
      { status: 403 }
    );
  }

  const shoot = await prisma.shoot.create({ data: { userId: user.id, title } });
  return NextResponse.json(shoot, { status: 201 });
}
