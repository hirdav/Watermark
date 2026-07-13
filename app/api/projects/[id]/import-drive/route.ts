import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  downloadDriveFile,
  extForMimeType,
  extractDriveId,
  getDriveMetadata,
  isDriveFolder,
  isSupportedDriveImage,
  listDriveFolderImages,
  type DriveFileMeta,
} from "@/lib/google-drive";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRemainingQuota, processImageUploads, type IncomingUpload } from "@/lib/upload-pipeline";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed, retryAfterSeconds } = rateLimit(`import-drive:${session.user.id}`, 10, 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const fileIds: string[] = Array.isArray(body?.fileIds)
    ? body.fileIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  if (!url) return NextResponse.json({ error: "Paste a Google Drive file or folder link" }, { status: 400 });

  const driveId = extractDriveId(url);
  if (!driveId) {
    return NextResponse.json({ error: "That doesn't look like a Google Drive link" }, { status: 400 });
  }

  try {
    const rootMeta = await getDriveMetadata(driveId);

    let targets: DriveFileMeta[];
    if (fileIds.length > 0) {
      // An explicit selection from the folder-browse step — re-verify each ID
      // server-side rather than trusting the client's earlier listing.
      const metas = await Promise.all(fileIds.map((id) => getDriveMetadata(id).catch(() => null)));
      targets = metas.filter((meta): meta is DriveFileMeta => !!meta && isSupportedDriveImage(meta));
    } else {
      targets = isDriveFolder(rootMeta)
        ? await listDriveFolderImages(driveId)
        : isSupportedDriveImage(rootMeta)
          ? [rootMeta]
          : [];
    }

    if (targets.length === 0) {
      const error =
        fileIds.length > 0
          ? "None of the selected photos could be imported — they may have been moved or unshared."
          : isDriveFolder(rootMeta)
            ? "No .jpg/.png images found in that Drive folder"
            : "That Drive file isn't a supported image (.jpg/.png)";
      return NextResponse.json({ error }, { status: 400 });
    }

    const { remaining, planLabel, maxImagesPerMonth } = await getRemainingQuota(user);
    if (targets.length > remaining) {
      return NextResponse.json(
        {
          error:
            remaining <= 0
              ? `You've used all ${maxImagesPerMonth} images included in your ${planLabel} plan this month. Upgrade to upload more.`
              : `You selected ${targets.length} image(s), but only ${remaining} more are allowed this month on your ${planLabel} plan. Upgrade for more.`,
        },
        { status: 400 }
      );
    }

    const incoming: IncomingUpload[] = await Promise.all(
      targets.map(async (meta) => ({
        filename: meta.name,
        ext: extForMimeType(meta.mimeType) ?? "",
        buffer: await downloadDriveFile(meta.id),
      }))
    );

    const result = await processImageUploads(user, project, incoming);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ uploaded: result.uploaded, skipped: result.skipped }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google Drive import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
