import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { logoPathFor, saveFile } from "@/lib/storage";
import { parseWatermarkFields } from "@/lib/watermark-form";
import { resolveLogoBuffer } from "@/lib/watermark-logo";

function respond(req: Request, projectId: string, params: Record<string, string>) {
  const wantsHtml = req.headers.get("accept")?.includes("text/html");
  if (wantsHtml) {
    const query = new URLSearchParams(params).toString();
    const location = `/dashboard/projects/${projectId}${query ? `?${query}` : ""}`;
    return new Response(null, { status: 303, headers: { Location: location } });
  }
  return NextResponse.json(params, { status: params.error ? 400 : 200 });
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
  const planConfig = PLANS[user.plan];
  if (!planConfig.customWatermark) {
    return respond(req, projectId, {
      error: `Custom watermarks (logo upload, position, size, opacity, rotation, margin) require the Pro or Studio plan.`,
    });
  }

  const form = await req.formData();
  const fields = parseWatermarkFields(form);

  let watermarkLogoPath = project.watermarkLogoPath;
  if (fields.type === "logo") {
    // A new file or a template logo replaces the project's saved logo; otherwise keep it.
    const logo = await resolveLogoBuffer({
      userId: user.id,
      logoFile: fields.logoFile,
      templateId: fields.templateId,
      projectLogoPath: null,
    });
    if (logo) {
      const rel = logoPathFor(user.id, project.id);
      await saveFile(rel, logo);
      watermarkLogoPath = rel;
    } else if (!project.watermarkLogoPath) {
      return respond(req, projectId, { error: "Upload a transparent PNG logo first." });
    }
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      watermarkType: fields.type === "logo" ? "LOGO" : "TEXT",
      watermarkText: fields.text || project.watermarkText,
      watermarkLogoPath,
      watermarkMode: fields.mode === "tiled" ? "TILED" : "SINGLE",
      watermarkPosition: fields.position,
      watermarkPosXPct: fields.posXPct,
      watermarkPosYPct: fields.posYPct,
      watermarkSizePct: fields.sizePercent,
      watermarkOpacity: fields.opacity,
      watermarkRotation: fields.rotationDeg,
      watermarkMarginPct: fields.marginPercent,
    },
  });

  return respond(req, projectId, { saved: "1" });
}
