import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, startOfCurrentBillingPeriod } from "@/lib/plans";
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

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Shoots
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{shoot.title}</h1>

      <div className="mt-4 flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
        <span className="text-zinc-500">Client gallery link:</span>
        <code className="flex-1 truncate text-zinc-900 dark:text-zinc-50">{galleryPath}</code>
        <Link href={galleryPath} target="_blank" className="font-medium text-zinc-900 underline dark:text-zinc-50">
          Open
        </Link>
      </div>

      <p className="mt-3 text-sm text-zinc-500">
        {usedThisPeriod} / {planConfig.maxImagesPerMonth === Infinity ? "unlimited" : planConfig.maxImagesPerMonth} images
        used this month on the {planConfig.label} plan.
      </p>

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
