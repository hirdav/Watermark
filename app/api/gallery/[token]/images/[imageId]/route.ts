import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFileFromStorage } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; imageId: string }> }
) {
  const { token, imageId } = await params;

  const image = await prisma.image.findUnique({ where: { id: imageId }, include: { project: true } });
  if (!image || image.project.shareToken !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFileFromStorage(image.watermarkedPath);
  const contentType = image.filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" },
  });
}
