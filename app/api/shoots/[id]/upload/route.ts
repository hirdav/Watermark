import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { extname } from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, startOfCurrentBillingPeriod } from "@/lib/plans";
import { originalPathFor, saveFile, watermarkedPathFor } from "@/lib/storage";
import { applyWatermark } from "@/lib/watermark";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png"]);

function respond(req: Request, shootId: string, params: Record<string, string>) {
  const wantsHtml = req.headers.get("accept")?.includes("text/html");
  if (wantsHtml) {
    const url = new URL(`/dashboard/shoots/${shootId}`, req.url);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return NextResponse.redirect(url, { status: 303 });
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

  const watermarkText = planConfig.customWatermarkText ? shoot.watermarkText : undefined;

  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      skipped++;
      continue;
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const { buffer: watermarkedBuffer } = await applyWatermark(inputBuffer, { text: watermarkText });

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
