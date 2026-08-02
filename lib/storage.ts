import { mkdir, readFile, writeFile, unlink, rm } from "fs/promises";
import { dirname, join, resolve } from "path";

const STORAGE_DIR = resolve(process.env.STORAGE_DIR || "./storage");

export function originalPathFor(userId: string, projectId: string, filename: string): string {
  return join(userId, projectId, "original", filename);
}

export function watermarkedPathFor(userId: string, projectId: string, filename: string): string {
  return join(userId, projectId, "watermarked", filename);
}

export function logoPathFor(userId: string, projectId: string): string {
  return join(userId, projectId, "watermark-logo.png");
}

export function studioLogoPathFor(userId: string, projectId: string): string {
  return join(userId, projectId, "studio-logo.png");
}

export function templateLogoPathFor(userId: string, templateId: string): string {
  return join(userId, "templates", `${templateId}.png`);
}

export async function saveFile(relativePath: string, data: Buffer): Promise<void> {
  const fullPath = join(STORAGE_DIR, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
}

export async function readFileFromStorage(relativePath: string): Promise<Buffer> {
  return readFile(join(STORAGE_DIR, relativePath));
}

export async function deleteFileFromStorage(relativePath: string): Promise<void> {
  await unlink(join(STORAGE_DIR, relativePath)).catch(() => {});
}

/** Removes every file for a project (originals, watermarked copies, logo) in one go. */
export async function deleteProjectStorage(userId: string, projectId: string): Promise<void> {
  await rm(join(STORAGE_DIR, userId, projectId), { recursive: true, force: true }).catch(() => {});
}
