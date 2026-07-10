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
} from "@/lib/google-drive";
import { getRemainingQuota, processImageUploads, type IncomingUpload } from "@/lib/upload-pipeline";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "Paste a Google Drive file or folder link" }, { status: 400 });

  const driveId = extractDriveId(url);
  if (!driveId) {
    return NextResponse.json({ error: "That doesn't look like a Google Drive link" }, { status: 400 });
  }

  try {
    const rootMeta = await getDriveMetadata(driveId);

    const targets = isDriveFolder(rootMeta)
      ? await listDriveFolderImages(driveId)
      : isSupportedDriveImage(rootMeta)
        ? [rootMeta]
        : [];

    if (targets.length === 0) {
      return NextResponse.json(
        { error: isDriveFolder(rootMeta) ? "No .jpg/.png images found in that Drive folder" : "That Drive file isn't a supported image (.jpg/.png)" },
        { status: 400 }
      );
    }

    const { remaining, planLabel, maxImagesPerMonth } = await getRemainingQuota(user);
    if (targets.length > remaining) {
      return NextResponse.json(
        {
          error:
            remaining <= 0
              ? `You've used all ${maxImagesPerMonth} images included in your ${planLabel} plan this month. Upgrade to upload more.`
              : `That Drive folder has ${targets.length} image(s), but only ${remaining} more are allowed this month on your ${planLabel} plan. Upgrade for more.`,
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
