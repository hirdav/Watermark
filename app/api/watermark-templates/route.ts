import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { saveFile, templateLogoPathFor } from "@/lib/storage";
import { parseWatermarkFields } from "@/lib/watermark-form";
import { resolveLogoBuffer } from "@/lib/watermark-logo";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.watermarkTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      text: t.text,
      hasLogo: !!t.logoPath,
      mode: t.mode,
      position: t.position,
      posXPct: t.posXPct,
      posYPct: t.posYPct,
      sizePct: t.sizePct,
      opacityPct: Math.round(t.opacity * 100),
      rotation: t.rotation,
      marginPct: t.marginPct,
    }))
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!PLANS[user.plan].customWatermark) {
    return NextResponse.json({ error: "Watermark templates require the Pro or Studio plan." }, { status: 403 });
  }

  const form = await req.formData();
  const fields = parseWatermarkFields(form);
  const name = String(form.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ error: "Template name is required" }, { status: 400 });

  // Logo source priority: uploaded file, another template's logo, the given project's saved logo.
  let logo: Buffer | undefined;
  if (fields.type === "logo") {
    const projectIdRaw = form.get("projectId");
    const projectId = typeof projectIdRaw === "string" && projectIdRaw ? projectIdRaw : null;
    const project = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;
    logo = await resolveLogoBuffer({
      userId: user.id,
      logoFile: fields.logoFile,
      templateId: fields.templateId,
      projectLogoPath: project && project.userId === user.id ? project.watermarkLogoPath : null,
    });
    if (!logo) return NextResponse.json({ error: "Upload a transparent PNG logo first." }, { status: 400 });
  }

  const template = await prisma.watermarkTemplate.create({
    data: {
      userId: user.id,
      name,
      type: fields.type === "logo" ? "LOGO" : "TEXT",
      text: fields.text || "PROOF",
      mode: fields.mode === "tiled" ? "TILED" : "SINGLE",
      position: fields.position,
      posXPct: fields.posXPct,
      posYPct: fields.posYPct,
      sizePct: fields.sizePercent,
      opacity: fields.opacity,
      rotation: fields.rotationDeg,
      marginPct: fields.marginPercent,
    },
  });

  if (logo) {
    const rel = templateLogoPathFor(user.id, template.id);
    await saveFile(rel, logo);
    await prisma.watermarkTemplate.update({ where: { id: template.id }, data: { logoPath: rel } });
  }

  return NextResponse.json({ id: template.id, name: template.name }, { status: 201 });
}
