import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteProjectStorage } from "@/lib/storage";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id: projectId } });
  await deleteProjectStorage(project.userId, project.id);

  return NextResponse.json({ id: projectId });
}
