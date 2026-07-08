import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { extname } from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, startOfCurrentBillingPeriod } from "@/lib/plans";
import { originalPathFor, readFileFromStorage, saveFile, watermarkedPathFor } from "@/lib/storage";
import { applyWatermark, type WatermarkConfig } from "@/lib/watermark";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png"]);

function respond(req: Request, shootId: string, params: Record<string, string>) {
  const wantsHtml = req.headers.get("accept")?.includes("text/html");
  if (wantsHtml) {
    const query = new URLSearchParams(params).toString();
    const location = `/dashboard/shoots/${shootId}${query ? `?${query}` : ""}`;
    return new Response(null, { status: 303, headers: { Location: location } });
  }
  return NextResponse.json(params, { status: params.error ? 400 : 201 });
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

  const usedThisPeriod = await prisma.image.count({
    where: { shoot: { userId: user.id }, createdAt: { gte: startOfCurrentBillingPeriod() } },
  });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return respond(req, shootId, { error: "No files provided" });
  }

  const remaining = planConfig.maxImagesPerMonth - usedThisPeriod;
  if (remaining <= 0) {
    return respond(req, shootId, {
      error: `You've used all ${planConfig.maxImagesPerMonth} images included in your ${planConfig.label} plan this month. Upgrade to upload more.`,
    });
  }
  if (files.length > remaining) {
    return respond(req, shootId, {
      error: `Only ${remaining} more image(s) allowed this month on your ${planConfig.label} plan. Upgrade for more.`,
    });
  }

  const watermarkConfig: WatermarkConfig = planConfig.customWatermark
    ? {
        type: shoot.watermarkType === "LOGO" ? "logo" : "text",
        text: shoot.watermarkText,
        logo:
          shoot.watermarkType === "LOGO" && shoot.watermarkLogoPath
            ? await readFileFromStorage(shoot.watermarkLogoPath)
            : undefined,
        mode: shoot.watermarkMode === "TILED" ? "tiled" : "single",
        position: shoot.watermarkPosition,
        posXPct: shoot.watermarkPosXPct,
        posYPct: shoot.watermarkPosYPct,
        sizePercent: shoot.watermarkSizePct,
        opacity: shoot.watermarkOpacity,
        rotationDeg: shoot.watermarkRotation,
        marginPercent: shoot.watermarkMarginPct,
      }
    : {
        type: "text",
        text: undefined,
        mode: "single",
        position: "CENTER",
        sizePercent: 40,
        opacity: 0.3,
        rotationDeg: -30,
        marginPercent: 4,
      };

  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      skipped++;
      continue;
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const { buffer: watermarkedBuffer } = await applyWatermark(inputBuffer, watermarkConfig);

    const storedName = `${nanoid()}${ext}`;
    const originalRel = originalPathFor(user.id, shoot.id, storedName);
    const watermarkedRel = watermarkedPathFor(user.id, shoot.id, storedName);

    await saveFile(originalRel, inputBuffer);
    await saveFile(watermarkedRel, watermarkedBuffer);

    await prisma.image.create({
      data: {
        shootId: shoot.id,
        filename: file.name,
        originalPath: originalRel,
        watermarkedPath: watermarkedRel,
      },
    });
    uploaded++;
  }

  if (uploaded === 0) {
    return respond(req, shootId, { error: "No supported image files (.jpg/.jpeg/.png) were found in that selection." });
  }

  return respond(req, shootId, {
    uploaded: String(uploaded),
    ...(skipped > 0 ? { skipped: String(skipped) } : {}),
  });
}
