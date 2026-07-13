import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_FEEDBACK_LENGTH = 500;

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { allowed, retryAfterSeconds } = rateLimit(`gallery-feedback:${getClientIp(req.headers)}`, 15, 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const { token } = await params;
  const form = await req.formData();
  const imageId = form.get("imageId");
  const feedbackRaw = form.get("feedback");
  if (typeof imageId !== "string" || typeof feedbackRaw !== "string") {
    return NextResponse.json({ error: "imageId and feedback are required" }, { status: 400 });
  }

  const image = await prisma.image.findUnique({ where: { id: imageId }, include: { project: true } });
  if (!image || image.project.shareToken !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const feedback = feedbackRaw.trim().slice(0, MAX_FEEDBACK_LENGTH) || null;
  const updated = await prisma.image.update({ where: { id: imageId }, data: { feedback } });

  return NextResponse.json({ id: updated.id, feedback: updated.feedback });
}
