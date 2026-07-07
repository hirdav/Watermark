import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = await req.formData();
  const imageId = form.get("imageId");
  if (typeof imageId !== "string") {
    return NextResponse.json({ error: "imageId is required" }, { status: 400 });
  }

  const image = await prisma.image.findUnique({ where: { id: imageId }, include: { shoot: true } });
  if (!image || image.shoot.shareToken !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.image.update({ where: { id: imageId }, data: { selected: !image.selected } });

  return NextResponse.redirect(new URL(`/gallery/${token}`, req.url), { status: 303 });
}
