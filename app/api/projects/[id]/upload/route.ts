import { NextResponse } from "next/server";
import { extname } from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processImageUploads, type IncomingUpload } from "@/lib/upload-pipeline";

function respond(req: Request, projectId: string, params: Record<string, string>) {
  const wantsHtml = req.headers.get("accept")?.includes("text/html");
  if (wantsHtml) {
    const query = new URLSearchParams(params).toString();
    const location = `/dashboard/projects/${projectId}${query ? `?${query}` : ""}`;
    return new Response(null, { status: 303, headers: { Location: location } });
  }
  return NextResponse.json(params, { status: params.error ? 400 : 201 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  const incoming: IncomingUpload[] = await Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      ext: extname(file.name).toLowerCase(),
      buffer: Buffer.from(await file.arrayBuffer()),
    }))
  );

  const result = await processImageUploads(user, project, incoming);
  if (result.error) return respond(req, projectId, { error: result.error });

  return respond(req, projectId, {
    uploaded: String(result.uploaded),
    ...(result.skipped > 0 ? { skipped: String(result.skipped) } : {}),
  });
}
