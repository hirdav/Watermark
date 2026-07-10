-- Rename Shoot -> Project (table, column, constraints, index). All are
-- metadata-only operations in Postgres, so this is instant and safe on a
-- table with existing data.

ALTER TABLE "Shoot" RENAME TO "Project";
ALTER TABLE "Project" RENAME CONSTRAINT "Shoot_pkey" TO "Project_pkey";
ALTER TABLE "Project" RENAME CONSTRAINT "Shoot_userId_fkey" TO "Project_userId_fkey";
ALTER INDEX "Shoot_shareToken_key" RENAME TO "Project_shareToken_key";

ALTER TABLE "Image" RENAME COLUMN "shootId" TO "projectId";
ALTER TABLE "Image" RENAME CONSTRAINT "Image_shootId_fkey" TO "Image_projectId_fkey";
