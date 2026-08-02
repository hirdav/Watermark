import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFileFromStorage } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const project = await prisma.project.findUnique({ where: { shareToken: token } });
  if (!project || !project.studioLogoPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFileFromStorage(project.studioLogoPath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
}
