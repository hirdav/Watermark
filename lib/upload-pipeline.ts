import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import type { Project, User } from "@/lib/generated/prisma/client";
import { formatStorageLimit, PLANS, startOfCurrentBillingPeriod } from "@/lib/plans";
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
  /** True if some files were skipped because the project's storage cap was hit (not just unsupported extensions). */
  storageLimitReached?: boolean;
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

/** Total bytes (original + watermarked) already stored for a project. */
export async function getProjectStorageUsageBytes(projectId: string): Promise<number> {
  const { _sum } = await prisma.image.aggregate({ where: { projectId }, _sum: { sizeBytes: true } });
  return _sum.sizeBytes ?? 0;
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

  const storageCapBytes =
    planConfig.maxStorageMBPerProject === Infinity ? Infinity : planConfig.maxStorageMBPerProject * 1024 * 1024;
  let storageUsedBytes = storageCapBytes === Infinity ? 0 : await getProjectStorageUsageBytes(project.id);

  let uploaded = 0;
  let skipped = 0;
  let stoppedForStorage = false;

  for (const file of incoming) {
    if (!ALLOWED_EXT.has(file.ext)) {
      skipped++;
      continue;
    }

    // Rough pre-check using the original's size (the watermarked copy is
    // rarely more than a little larger) so we can skip before doing the
    // expensive watermarking work for files that clearly won't fit.
    if (storageUsedBytes + file.buffer.length * 2 > storageCapBytes) {
      stoppedForStorage = true;
      skipped++;
      continue;
    }

    const { buffer: watermarkedBuffer } = await applyWatermark(file.buffer, watermarkConfig);
    const sizeBytes = file.buffer.length + watermarkedBuffer.length;

    if (storageUsedBytes + sizeBytes > storageCapBytes) {
      stoppedForStorage = true;
      skipped++;
      continue;
    }

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
        sizeBytes,
      },
    });
    uploaded++;
    storageUsedBytes += sizeBytes;
  }

  if (uploaded === 0) {
    if (stoppedForStorage) {
      return {
        uploaded: 0,
        skipped,
        error: `This project has used all ${planConfig.maxStorageMBPerProject === Infinity ? "" : formatStorageLimit(planConfig.maxStorageMBPerProject) + " "}of storage included in your ${planConfig.label} plan. Upgrade for more, or free up space by deleting photos.`,
      };
    }
    return { uploaded: 0, skipped, error: "No supported image files (.jpg/.jpeg/.png) were found in that selection." };
  }

  return { uploaded, skipped, storageLimitReached: stoppedForStorage || undefined };
}
