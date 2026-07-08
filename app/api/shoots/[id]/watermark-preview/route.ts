import sharp from "sharp";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { readFileFromStorage } from "@/lib/storage";
import { applyWatermark } from "@/lib/watermark";
import { parseWatermarkFields } from "@/lib/watermark-form";
import { resolveLogoBuffer } from "@/lib/watermark-logo";

async function sampleBaseImage(shootId: string): Promise<Buffer> {
  const image = await prisma.image.findFirst({ where: { shootId }, orderBy: { createdAt: "desc" } });
  if (image) {
    return readFileFromStorage(image.originalPath);
  }
  return sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 210, g: 210, b: 210 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shootId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shoot = await prisma.shoot.findUnique({ where: { id: shootId } });
  if (!shoot || shoot.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const planConfig = PLANS[user.plan];
  if (!planConfig.customWatermark) {
    return NextResponse.json({ error: "Custom watermarks require the Pro or Studio plan." }, { status: 403 });
  }

  const form = await req.formData();
  const fields = parseWatermarkFields(form);

  const logo = await resolveLogoBuffer({
    userId: user.id,
    logoFile: fields.logoFile,
    templateId: fields.templateId,
    shootLogoPath: shoot.watermarkLogoPath,
  });

  if (fields.type === "logo" && !logo) {
    return NextResponse.json({ error: "Upload a transparent PNG logo first." }, { status: 400 });
  }

  const base = await sampleBaseImage(shootId);
  const { buffer, format } = await applyWatermark(base, {
    type: fields.type,
    text: fields.text,
    logo,
    mode: fields.mode,
    position: fields.position,
    posXPct: fields.posXPct,
    posYPct: fields.posYPct,
    sizePercent: fields.sizePercent,
    opacity: fields.opacity,
    rotationDeg: fields.rotationDeg,
    marginPercent: fields.marginPercent,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": format === "png" ? "image/png" : "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
