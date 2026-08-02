import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveFile, studioLogoPathFor } from "@/lib/storage";

const MAX_CLIENT_NAME_LENGTH = 100;
const MAX_STUDIO_NAME_LENGTH = 100;
const MAX_WELCOME_MESSAGE_LENGTH = 500;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await req.formData();
  const clientName = String(form.get("clientName") ?? "").trim().slice(0, MAX_CLIENT_NAME_LENGTH) || null;
  const welcomeMessage = String(form.get("welcomeMessage") ?? "").trim().slice(0, MAX_WELCOME_MESSAGE_LENGTH) || null;
  const studioName = String(form.get("studioName") ?? "").trim().slice(0, MAX_STUDIO_NAME_LENGTH) || null;

  let studioLogoPath = project.studioLogoPath;
  const logoFile = form.get("studioLogo");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.type !== "image/png") {
      return NextResponse.json({ error: "Studio logo must be a PNG image." }, { status: 400 });
    }
    const rel = studioLogoPathFor(session.user.id, project.id);
    await saveFile(rel, Buffer.from(await logoFile.arrayBuffer()));
    studioLogoPath = rel;
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { clientName, welcomeMessage, studioName, studioLogoPath },
  });

  return NextResponse.json({
    clientName: updated.clientName,
    welcomeMessage: updated.welcomeMessage,
    studioName: updated.studioName,
    hasStudioLogo: !!updated.studioLogoPath,
  });
}
