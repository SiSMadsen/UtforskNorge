/**
 * Image validation shared by the upload routes and the storage layer.
 * @module
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export type ImageKind = { mime: string; ext: string };

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export function mimeForExtension(ext: string): string {
  return EXT_TO_MIME[ext.toLowerCase()] ?? "application/octet-stream";
}

/**
 * Sniff the image type from magic bytes rather than trusting the client-supplied
 * MIME. Returns null for anything that isn't a supported raster image.
 */
export function detectImageType(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // GIF: "GIF87a" / "GIF89a"
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return { mime: "image/gif", ext: "gif" };
  }

  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));

  // WEBP: "RIFF"...."WEBP"
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }

  // AVIF: ISO-BMFF "ftyp" box with an "avif"/"avis" brand
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "avif" || brand === "avis") {
      return { mime: "image/avif", ext: "avif" };
    }
  }

  return null;
}

export type ReadImageUploadResult =
  | { ok: true; data: Buffer; ext: string; mime: string }
  | { ok: false; status: number; error: string };

/**
 * Pulls the `file` field out of a multipart request and validates it is a
 * supported image within the size limit. MIME is decided from magic bytes, not
 * the client-supplied `file.type`.
 */
export async function readImageUpload(
  request: Request,
): Promise<ReadImageUploadResult> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, status: 400, error: "Expected a multipart/form-data body." };
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, status: 400, error: "Missing 'file' upload." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, error: "Image exceeds the 10 MB limit." };
  }

  const data = Buffer.from(await file.arrayBuffer());
  const kind = detectImageType(data);
  if (!kind) {
    return {
      ok: false,
      status: 415,
      error: "File is not a supported image (JPEG, PNG, WebP, GIF, AVIF).",
    };
  }

  return { ok: true, data, ext: kind.ext, mime: kind.mime };
}
