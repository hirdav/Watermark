import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFileFromStorage } from "@/lib/storage";

export async function GET(req: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const image = await prisma.image.findUnique({ where: { id: imageId }, include: { project: true } });
  if (!image || image.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const variant = new URL(req.url).searchParams.get("variant") === "original" ? "original" : "watermarked";
  const relPath = variant === "original" ? image.originalPath : image.watermarkedPath;
  const buffer = await readFileFromStorage(relPath);

  const contentType = image.filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
  });
}
