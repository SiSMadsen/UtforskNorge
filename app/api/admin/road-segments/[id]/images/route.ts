import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { roadSegmentImages, roadSegments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/geo";
import { toImageRef } from "@/lib/geojson";
import { readImageUpload } from "@/lib/image";
import { roadSegmentImageList } from "@/lib/images";
import { saveImage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

async function roadSegmentExists(id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: roadSegments.id })
    .from(roadSegments)
    .where(eq(roadSegments.id, id));
  return Boolean(row);
}

/** Upload one image for a road segment. multipart/form-data, field name `file`. */
export async function POST(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id) || !(await roadSegmentExists(id))) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const upload = await readImageUpload(request);
  if (!upload.ok) {
    return Response.json({ error: upload.error }, { status: upload.status });
  }

  const { storagePath } = await saveImage(
    { data: upload.data, ext: upload.ext },
    "road-segment",
    id,
  );

  const [{ next }] = await db
    .select({
      next: sql<number>`coalesce(max(${roadSegmentImages.sortOrder}), -1) + 1`,
    })
    .from(roadSegmentImages)
    .where(eq(roadSegmentImages.roadSegmentId, id));

  const [row] = await db
    .insert(roadSegmentImages)
    .values({ roadSegmentId: id, storagePath, sortOrder: Number(next) })
    .returning();

  return Response.json({ image: toImageRef(row) }, { status: 201 });
}

/** Reorder a road segment's images. Body: `{ order: string[] }` of image ids. */
export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id) || !(await roadSegmentExists(id))) {
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
        .select({ id: roadSegmentImages.id })
        .from(roadSegmentImages)
        .where(eq(roadSegmentImages.roadSegmentId, id))
    ).map((r) => r.id),
  );
  const finalOrder = (order as string[]).filter((x) => owned.has(x));

  await db.transaction(async (tx) => {
    for (let i = 0; i < finalOrder.length; i++) {
      await tx
        .update(roadSegmentImages)
        .set({ sortOrder: i })
        .where(eq(roadSegmentImages.id, finalOrder[i]));
    }
  });

  return Response.json({ images: await roadSegmentImageList(id) });
}
