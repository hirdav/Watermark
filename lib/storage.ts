import { mkdir, readFile, writeFile } from "fs/promises";
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
