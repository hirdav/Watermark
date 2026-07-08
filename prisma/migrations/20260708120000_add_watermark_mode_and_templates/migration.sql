-- CreateEnum
CREATE TYPE "WatermarkMode" AS ENUM ('SINGLE', 'TILED');

-- AlterEnum
ALTER TYPE "WatermarkPosition" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "Shoot" ADD COLUMN     "watermarkMode" "WatermarkMode" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "watermarkPosXPct" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "watermarkPosYPct" DOUBLE PRECISION NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "WatermarkTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WatermarkType" NOT NULL DEFAULT 'TEXT',
    "text" TEXT NOT NULL DEFAULT 'PROOF',
    "logoPath" TEXT,
    "mode" "WatermarkMode" NOT NULL DEFAULT 'SINGLE',
    "position" "WatermarkPosition" NOT NULL DEFAULT 'CENTER',
    "posXPct" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "posYPct" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "sizePct" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT -30,
    "marginPct" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatermarkTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WatermarkTemplate" ADD CONSTRAINT "WatermarkTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
