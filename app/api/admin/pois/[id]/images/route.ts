import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { poiImages, pois } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/geo";
import { toImageRef } from "@/lib/geojson";
import { readImageUpload } from "@/lib/image";
import { poiImageList } from "@/lib/images";
import { saveImage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

async function poiExists(id: string): Promise<boolean> {
  const [row] = await db.select({ id: pois.id }).from(pois).where(eq(pois.id, id));
  return Boolean(row);
}

/** Upload one image for a POI. multipart/form-data, field name `file`. */
export async function POST(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id) || !(await poiExists(id))) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const upload = await readImageUpload(request);
  if (!upload.ok) {
    return Response.json({ error: upload.error }, { status: upload.status });
  }

  const { storagePath } = await saveImage(
    { data: upload.data, ext: upload.ext },
    "poi",
    id,
  );

  const [{ next }] = await db
    .select({
      next: sql<number>`coalesce(max(${poiImages.sortOrder}), -1) + 1`,
    })
    .from(poiImages)
    .where(eq(poiImages.poiId, id));

  const [row] = await db
    .insert(poiImages)
    .values({ poiId: id, storagePath, sortOrder: Number(next) })
    .returning();

  return Response.json({ image: toImageRef(row) }, { status: 201 });
}

/** Reorder a POI's images. Body: `{ order: string[] }` of image ids. */
export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id) || !(await poiExists(id))) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const order = (body as { order?: unknown })?.order;
  if (
    !Array.isArray(order) ||
    !order.every((x) => typeof x === "string" && isUuid(x))
  ) {
    return Response.json(
      { error: "Expected { order: string[] } of image ids." },
      { status: 400 },
    );
  }

  const owned = new Set(
    (
      await db
        .select({ id: poiImages.id })
        .from(poiImages)
        .where(eq(poiImages.poiId, id))
    ).map((r) => r.id),
  );
  const finalOrder = (order as string[]).filter((x) => owned.has(x));

  await db.transaction(async (tx) => {
    for (let i = 0; i < finalOrder.length; i++) {
      await tx
        .update(poiImages)
        .set({ sortOrder: i })
        .where(eq(poiImages.id, finalOrder[i]));
    }
  });

  return Response.json({ images: await poiImageList(id) });
}
