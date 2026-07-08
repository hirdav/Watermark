import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { logoPathFor, saveFile } from "@/lib/storage";
import { parseWatermarkFields } from "@/lib/watermark-form";
import { resolveLogoBuffer } from "@/lib/watermark-logo";

function respond(req: Request, shootId: string, params: Record<string, string>) {
  const wantsHtml = req.headers.get("accept")?.includes("text/html");
  if (wantsHtml) {
    const query = new URLSearchParams(params).toString();
    const location = `/dashboard/shoots/${shootId}${query ? `?${query}` : ""}`;
    return new Response(null, { status: 303, headers: { Location: location } });
  }
  return NextResponse.json(params, { status: params.error ? 400 : 200 });
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
    return respond(req, shootId, {
      error: `Custom watermarks (logo upload, position, size, opacity, rotation, margin) require the Pro or Studio plan.`,
    });
  }

  const form = await req.formData();
  const fields = parseWatermarkFields(form);

  let watermarkLogoPath = shoot.watermarkLogoPath;
  if (fields.type === "logo") {
    // A new file or a template logo replaces the shoot's saved logo; otherwise keep it.
    const logo = await resolveLogoBuffer({
      userId: user.id,
      logoFile: fields.logoFile,
      templateId: fields.templateId,
      shootLogoPath: null,
    });
    if (logo) {
      const rel = logoPathFor(user.id, shoot.id);
      await saveFile(rel, logo);
      watermarkLogoPath = rel;
    } else if (!shoot.watermarkLogoPath) {
      return respond(req, shootId, { error: "Upload a transparent PNG logo first." });
    }
  }

  await prisma.shoot.update({
    where: { id: shoot.id },
    data: {
      watermarkType: fields.type === "logo" ? "LOGO" : "TEXT",
      watermarkText: fields.text || shoot.watermarkText,
      watermarkLogoPath,
      watermarkMode: fields.mode === "tiled" ? "TILED" : "SINGLE",
      watermarkPosition: fields.position,
      watermarkPosXPct: fields.posXPct,
      watermarkPosYPct: fields.posYPct,
      watermarkSizePct: fields.sizePercent,
      watermarkOpacity: fields.opacity,
      watermarkRotation: fields.rotationDeg,
      watermarkMarginPct: fields.marginPercent,
    },
  });

  return respond(req, shootId, { saved: "1" });
}
