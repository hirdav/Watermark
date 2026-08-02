import { ZipArchive } from "archiver";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { readFileFromStorage } from "@/lib/storage";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { allowed, retryAfterSeconds } = rateLimit(`gallery-download:${getClientIp(req.headers)}`, 10, 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const { token } = await params;
  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: { images: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const favorited = project.images.filter((i) => i.selected);
  const images = favorited.length > 0 ? favorited : project.images;
  if (images.length === 0) {
    return NextResponse.json({ error: "There are no photos to download yet" }, { status: 400 });
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  for (const image of images) {
    const buffer = await readFileFromStorage(image.watermarkedPath);
    archive.append(buffer, { name: image.filename });
  }
  await archive.finalize();

  const zipBuffer = Buffer.concat(chunks);
  const safeName = project.title.replace(/[^a-z0-9-_ ]/gi, "_") || "gallery";
  const suffix = favorited.length > 0 ? "favorites" : "all";

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}-${suffix}.zip"`,
    },
  });
}
