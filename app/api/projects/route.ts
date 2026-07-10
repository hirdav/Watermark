import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { images: true } } },
  });
  return NextResponse.json(projects);
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
  const projectCount = await prisma.project.count({ where: { userId: user.id } });
  if (projectCount >= planConfig.maxProjects) {
    return NextResponse.json(
      {
        error: `Your ${planConfig.label} plan allows up to ${planConfig.maxProjects} active project(s). Upgrade to create more.`,
      },
      { status: 403 }
    );
  }

  const project = await prisma.project.create({ data: { userId: user.id, title } });
  return NextResponse.json(project, { status: 201 });
}
