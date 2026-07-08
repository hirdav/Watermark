-- CreateEnum
CREATE TYPE "WatermarkType" AS ENUM ('TEXT', 'LOGO');

-- CreateEnum
CREATE TYPE "WatermarkPosition" AS ENUM ('TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT', 'MIDDLE_LEFT', 'CENTER', 'MIDDLE_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT');

-- AlterTable
ALTER TABLE "Shoot" ADD COLUMN     "watermarkLogoPath" TEXT,
ADD COLUMN     "watermarkMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 4,
ADD COLUMN     "watermarkOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
ADD COLUMN     "watermarkPosition" "WatermarkPosition" NOT NULL DEFAULT 'CENTER',
ADD COLUMN     "watermarkRotation" DOUBLE PRECISION NOT NULL DEFAULT -30,
ADD COLUMN     "watermarkSizePct" DOUBLE PRECISION NOT NULL DEFAULT 40,
ADD COLUMN     "watermarkType" "WatermarkType" NOT NULL DEFAULT 'TEXT';

