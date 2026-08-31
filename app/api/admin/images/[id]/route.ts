import { eq } from "drizzle-orm";

import { db } from "@/db";
import { poiImages, roadSegmentImages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/geo";
import { deleteImage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

/** Delete one image (POI or road segment) — file first, then the DB row. */
export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const [poiImage] = await db
    .select({ storagePath: poiImages.storagePath })
    .from(poiImages)
    .where(eq(poiImages.id, id));

  const [roadImage] = poiImage
    ? []
    : await db
        .select({ storagePath: roadSegmentImages.storagePath })
        .from(roadSegmentImages)
        .where(eq(roadSegmentImages.id, id));

  const found = poiImage ?? roadImage;
  if (!found) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  await deleteImage(found.storagePath);

  if (poiImage) {
    await db.delete(poiImages).where(eq(poiImages.id, id));
  } else {
    await db.delete(roadSegmentImages).where(eq(roadSegmentImages.id, id));
  }

  return Response.json({ ok: true });
}
