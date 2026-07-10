import { prisma } from "./db";
import { readFileFromStorage } from "./storage";

/**
 * Resolves the logo bytes for a watermark operation, in priority order:
 * a freshly uploaded file, the logo saved on one of the user's templates,
 * then the project's own saved logo.
 */
export async function resolveLogoBuffer(params: {
  userId: string;
  logoFile: File | null;
  templateId: string | null;
  projectLogoPath?: string | null;
}): Promise<Buffer | undefined> {
  if (params.logoFile) {
    return Buffer.from(await params.logoFile.arrayBuffer());
  }
  if (params.templateId) {
    const template = await prisma.watermarkTemplate.findUnique({ where: { id: params.templateId } });
    if (template && template.userId === params.userId && template.logoPath) {
      return readFileFromStorage(template.logoPath);
    }
  }
  if (params.projectLogoPath) {
    return readFileFromStorage(params.projectLogoPath);
  }
  return undefined;
}
