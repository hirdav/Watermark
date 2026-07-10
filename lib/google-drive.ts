const DRIVE_API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const EXT_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export interface DriveFileMeta {
  id: string;
  name: string;
  mimeType: string;
}

/** Pulls a file/folder ID out of any of Drive's link shapes, or a bare ID pasted directly. */
export function extractDriveId(input: string): string | null {
  const trimmed = input.trim();
  const patterns = [/\/folders\/([a-zA-Z0-9_-]+)/, /\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) return match[1];
  }
  return /^[a-zA-Z0-9_-]{10,}$/.test(trimmed) ? trimmed : null;
}

function apiKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Google Drive import isn't configured on this server.");
  return key;
}

const NOT_SHARED_HINT = 'Make sure it\'s shared as "Anyone with the link".';

export async function getDriveMetadata(id: string): Promise<DriveFileMeta> {
  const url = `${DRIVE_API}/files/${id}?key=${apiKey()}&fields=id,name,mimeType&supportsAllDrives=true`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error(`That Drive link couldn't be found. ${NOT_SHARED_HINT}`);
    throw new Error(`Google Drive request failed (${res.status}). ${NOT_SHARED_HINT}`);
  }
  return res.json();
}

export function isDriveFolder(meta: DriveFileMeta): boolean {
  return meta.mimeType === FOLDER_MIME_TYPE;
}

export function isSupportedDriveImage(meta: DriveFileMeta): boolean {
  return IMAGE_MIME_TYPES.has(meta.mimeType);
}

export function extForMimeType(mimeType: string): string | null {
  return EXT_BY_MIME_TYPE[mimeType] ?? null;
}

/** Lists direct-child image files of a Drive folder (does not recurse into subfolders). */
export async function listDriveFolderImages(folderId: string): Promise<DriveFileMeta[]> {
  const files: DriveFileMeta[] = [];
  let pageToken: string | undefined;
  const q = encodeURIComponent(
    `'${folderId}' in parents and trashed = false and (mimeType = 'image/jpeg' or mimeType = 'image/png')`
  );
  do {
    const url =
      `${DRIVE_API}/files?key=${apiKey()}&q=${q}&fields=nextPageToken,files(id,name,mimeType)` +
      `&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not list files in that Drive folder (${res.status}). ${NOT_SHARED_HINT}`);
    const body: { files?: DriveFileMeta[]; nextPageToken?: string } = await res.json();
    files.push(...(body.files ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return files;
}

export async function downloadDriveFile(id: string): Promise<Buffer> {
  const url = `${DRIVE_API}/files/${id}?alt=media&key=${apiKey()}&supportsAllDrives=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download a file from Drive (${res.status}). ${NOT_SHARED_HINT}`);
  return Buffer.from(await res.arrayBuffer());
}
