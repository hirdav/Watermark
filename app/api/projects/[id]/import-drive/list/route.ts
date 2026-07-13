import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  extractDriveId,
  getDriveMetadata,
  isDriveFolder,
  isSupportedDriveImage,
  listDriveFolderImages,
} from "@/lib/google-drive";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "Paste a Google Drive file or folder link" }, { status: 400 });

  const driveId = extractDriveId(url);
  if (!driveId) {
    return NextResponse.json({ error: "That doesn't look like a Google Drive link" }, { status: 400 });
  }

  try {
    const rootMeta = await getDriveMetadata(driveId);

    if (isDriveFolder(rootMeta)) {
      const items = await listDriveFolderImages(driveId);
      if (items.length === 0) {
        return NextResponse.json({ error: "No .jpg/.png images found in that Drive folder" }, { status: 400 });
      }
      return NextResponse.json({ kind: "folder", items });
    }

    if (isSupportedDriveImage(rootMeta)) {
      return NextResponse.json({ kind: "file", items: [rootMeta] });
    }

    return NextResponse.json({ error: "That Drive file isn't a supported image (.jpg/.png)" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google Drive request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
