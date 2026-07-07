import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";

const STORAGE_DIR = resolve(process.env.STORAGE_DIR || "./storage");

export function originalPathFor(userId: string, shootId: string, filename: string): string {
  return join(userId, shootId, "original", filename);
}

export function watermarkedPathFor(userId: string, shootId: string, filename: string): string {
  return join(userId, shootId, "watermarked", filename);
}

export async function saveFile(relativePath: string, data: Buffer): Promise<void> {
  const fullPath = join(STORAGE_DIR, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
}

export async function readFileFromStorage(relativePath: string): Promise<Buffer> {
  return readFile(join(STORAGE_DIR, relativePath));
}
