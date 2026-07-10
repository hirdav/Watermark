import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import type { Project, User } from "@/lib/generated/prisma/client";
import { PLANS, startOfCurrentBillingPeriod } from "@/lib/plans";
import { originalPathFor, readFileFromStorage, saveFile, watermarkedPathFor } from "@/lib/storage";
import { applyWatermark, type WatermarkConfig } from "@/lib/watermark";

export const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png"]);

export interface IncomingUpload {
  filename: string;
  /** Lowercase, includes the leading dot (e.g. ".jpg"). */
  ext: string;
  buffer: Buffer;
}

export interface UploadResult {
  uploaded: number;
  skipped: number;
  error?: string;
}

/** How many more images `user` can upload this billing period. Lets callers bail out
 * before doing expensive work (e.g. downloading a large Drive folder) that would
 * only be rejected anyway. */
export async function getRemainingQuota(user: User): Promise<{ remaining: number; planLabel: string; maxImagesPerMonth: number }> {
  const planConfig = PLANS[user.plan];
  const usedThisPeriod = await prisma.image.count({
    where: { project: { userId: user.id }, createdAt: { gte: startOfCurrentBillingPeriod() } },
  });
  return { remaining: planConfig.maxImagesPerMonth - usedThisPeriod, planLabel: planConfig.label, maxImagesPerMonth: planConfig.maxImagesPerMonth };
}

async function buildWatermarkConfig(project: Project, customWatermark: boolean): Promise<WatermarkConfig> {
  if (!customWatermark) {
    return {
      type: "text",
      text: undefined,
      mode: "single",
      position: "CENTER",
      sizePercent: 40,
      opacity: 0.3,
      rotationDeg: -30,
      marginPercent: 4,
    };
  }
  return {
    type: project.watermarkType === "LOGO" ? "logo" : "text",
    text: project.watermarkText,
    logo:
      project.watermarkType === "LOGO" && project.watermarkLogoPath
        ? await readFileFromStorage(project.watermarkLogoPath)
        : undefined,
    mode: project.watermarkMode === "TILED" ? "tiled" : "single",
    position: project.watermarkPosition,
    posXPct: project.watermarkPosXPct,
    posYPct: project.watermarkPosYPct,
    sizePercent: project.watermarkSizePct,
    opacity: project.watermarkOpacity,
    rotationDeg: project.watermarkRotation,
    marginPercent: project.watermarkMarginPct,
  };
}

/**
 * Shared by the local-file upload route and the Google Drive import route:
 * enforces plan quotas, watermarks each incoming buffer per the project's
 * saved config, and persists the original + watermarked files and Image rows.
 */
export async function processImageUploads(
  user: User,
  project: Project,
  incoming: IncomingUpload[]
): Promise<UploadResult> {
  if (incoming.length === 0) {
    return { uploaded: 0, skipped: 0, error: "No files provided" };
  }

  const planConfig = PLANS[user.plan];
  const { remaining, planLabel, maxImagesPerMonth } = await getRemainingQuota(user);
  if (remaining <= 0) {
    return {
      uploaded: 0,
      skipped: 0,
      error: `You've used all ${maxImagesPerMonth} images included in your ${planLabel} plan this month. Upgrade to upload more.`,
    };
  }
  if (incoming.length > remaining) {
    return {
      uploaded: 0,
      skipped: 0,
      error: `Only ${remaining} more image(s) allowed this month on your ${planLabel} plan. Upgrade for more.`,
    };
  }

  const watermarkConfig = await buildWatermarkConfig(project, planConfig.customWatermark);

  let uploaded = 0;
  let skipped = 0;

  for (const file of incoming) {
    if (!ALLOWED_EXT.has(file.ext)) {
      skipped++;
      continue;
    }

    const { buffer: watermarkedBuffer } = await applyWatermark(file.buffer, watermarkConfig);

    const storedName = `${nanoid()}${file.ext}`;
    const originalRel = originalPathFor(user.id, project.id, storedName);
    const watermarkedRel = watermarkedPathFor(user.id, project.id, storedName);

    await saveFile(originalRel, file.buffer);
    await saveFile(watermarkedRel, watermarkedBuffer);

    await prisma.image.create({
      data: {
        projectId: project.id,
        filename: file.filename,
        originalPath: originalRel,
        watermarkedPath: watermarkedRel,
      },
    });
    uploaded++;
  }

  if (uploaded === 0) {
    return { uploaded: 0, skipped, error: "No supported image files (.jpg/.jpeg/.png) were found in that selection." };
  }

  return { uploaded, skipped };
}
