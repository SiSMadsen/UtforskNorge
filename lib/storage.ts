import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { mimeForExtension } from "@/lib/image";

/**
 * Image storage abstraction. Today it writes to a gitignored `/uploads`
 * directory at the project root; swapping in MinIO/S3 later means reimplementing
 * these three functions without touching callers.
 *
 * A `storagePath` is an opaque, forward-slashed key persisted in the DB
 * (`*_images.storage_path`), e.g. `poi/<uuid>/<random>.jpg`. It is never a
 * filesystem path and never contains `..`.
 */

export type OwnerType = "poi" | "road-segment";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const ALLOWED_EXT = ["jpg", "png", "webp", "gif", "avif"] as const;
const STORAGE_PATH_RE = new RegExp(
  `^(poi|road-segment)/[0-9a-f-]{36}/[A-Za-z0-9_-]+\\.(${ALLOWED_EXT.join("|")})$`,
);

export function isValidStoragePath(storagePath: string): boolean {
  return STORAGE_PATH_RE.test(storagePath);
}

/** Resolve a storagePath to an absolute file path, guarding against escapes. */
function resolveInsideUploads(storagePath: string): string | null {
  if (!isValidStoragePath(storagePath)) return null;
  const abs = path.resolve(UPLOADS_DIR, storagePath);
  const root = path.resolve(UPLOADS_DIR);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

export async function saveImage(
  file: { data: Buffer; ext: string },
  ownerType: OwnerType,
  ownerId: string,
): Promise<{ storagePath: string }> {
  const storagePath = `${ownerType}/${ownerId}/${randomBytes(16).toString(
    "hex",
  )}.${file.ext}`;
  const abs = resolveInsideUploads(storagePath);
  if (!abs) throw new Error(`Refusing to write invalid storage path: ${storagePath}`);

  await mkdir(path.dirname(abs), { recursive: true });
  await writeFileAtomic(abs, file.data);
  return { storagePath };
}

export async function getImage(
  storagePath: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const abs = resolveInsideUploads(storagePath);
  if (!abs) return null;
  try {
    const data = await readFile(abs);
    const ext = path.extname(abs).slice(1);
    return { data, contentType: mimeForExtension(ext) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteImage(storagePath: string): Promise<void> {
  const abs = resolveInsideUploads(storagePath);
  if (!abs) return;
  await rm(abs, { force: true });
}

async function writeFileAtomic(abs: string, data: Buffer): Promise<void> {
  const tmp = `${abs}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, abs);
}
