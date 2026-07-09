import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, startOfCurrentBillingPeriod } from "@/lib/plans";
import { CopyButton } from "@/components/ui/CopyButton";
import { ShootWizard } from "./ShootWizard";

export default async function ShootDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const shoot = await prisma.shoot.findUnique({
    where: { id },
    include: { images: { orderBy: { createdAt: "desc" } } },
  });
  if (!shoot || shoot.userId !== session.user.id) notFound();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const planConfig = PLANS[user.plan];
  const usedThisPeriod = await prisma.image.count({
    where: { shoot: { userId: user.id }, createdAt: { gte: startOfCurrentBillingPeriod() } },
  });
  const templates = await prisma.watermarkTemplate.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const galleryPath = `/gallery/${shoot.shareToken}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const galleryUrl = `${proto}://${host}${galleryPath}`;

  const usagePct =
    planConfig.maxImagesPerMonth === Infinity
      ? 0
      : Math.min(100, Math.round((usedThisPeriod / planConfig.maxImagesPerMonth) * 100));

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z" clipRule="evenodd" />
        </svg>
        Shoots
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{shoot.title}</h1>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <span className="shrink-0 font-medium text-zinc-500">Client gallery link</span>
        <code className="flex-1 truncate text-zinc-900 dark:text-zinc-50">{galleryUrl}</code>
        <CopyButton value={galleryUrl} />
        <Link
          href={galleryPath}
          target="_blank"
          className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Open ↗
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <p className="shrink-0 text-sm text-zinc-500">
          {usedThisPeriod} / {planConfig.maxImagesPerMonth === Infinity ? "unlimited" : planConfig.maxImagesPerMonth} images this month
        </p>
        {planConfig.maxImagesPerMonth !== Infinity && (
          <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full ${usagePct >= 90 ? "bg-red-500" : "bg-zinc-900 dark:bg-zinc-50"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
      </div>

      <ShootWizard
        shootId={shoot.id}
        allowed={planConfig.customWatermark}
        templates={templates.map((t) => ({
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
        }))}
        images={shoot.images.map((image) => ({
          id: image.id,
          filename: image.filename,
          selected: image.selected,
        }))}
        initial={{
          type: shoot.watermarkType,
          text: shoot.watermarkText,
          hasLogo: !!shoot.watermarkLogoPath,
          mode: shoot.watermarkMode,
          position: shoot.watermarkPosition,
          posX: shoot.watermarkPosXPct,
          posY: shoot.watermarkPosYPct,
          sizePercent: shoot.watermarkSizePct,
          opacityPercent: Math.round(shoot.watermarkOpacity * 100),
          rotation: shoot.watermarkRotation,
          marginPercent: shoot.watermarkMarginPct,
        }}
      />
    </div>
  );
}
