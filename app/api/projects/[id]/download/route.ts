import { ZipArchive } from "archiver";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFileFromStorage } from "@/lib/storage";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id }, include: { images: true } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (project.images.length === 0) {
    return NextResponse.json({ error: "This project has no photos yet" }, { status: 400 });
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  for (const image of project.images) {
    const buffer = await readFileFromStorage(image.watermarkedPath);
    archive.append(buffer, { name: image.filename });
  }
  await archive.finalize();

  const zipBuffer = Buffer.concat(chunks);
  const safeName = project.title.replace(/[^a-z0-9-_ ]/gi, "_") || "project";

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
    },
  });
}
