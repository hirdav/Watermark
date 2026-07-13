import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const { allowed, retryAfterSeconds } = rateLimit(`waitlist:${getClientIp(req.headers)}`, 5, 10 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const instagram = typeof body?.instagram === "string" ? body.instagram.trim() : "";
  const plan = body?.plan === "PRO" || body?.plan === "STUDIO" ? body.plan : null;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (!plan) {
    return NextResponse.json({ error: "A valid plan is required" }, { status: 400 });
  }

  const session = await auth();

  const entry = await prisma.waitlistEntry.create({
    data: {
      userId: session?.user?.id ?? null,
      email,
      phone: phone || null,
      instagram: instagram || null,
      plan,
    },
  });

  return NextResponse.json({ id: entry.id }, { status: 201 });
}
