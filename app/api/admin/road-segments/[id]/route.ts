import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { roadSegmentImages, roadSegments } from "@/db/schema";
import type { LineString } from "@/db/postgis";
import { requireAdmin } from "@/lib/auth";
import { isUuid, parseLineString } from "@/lib/geo";
import { roadSegmentFeatureFromRow } from "@/lib/geojson";
import { roadSegmentImageList } from "@/lib/images";
import { deleteImage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const returning = {
  id: roadSegments.id,
  title: roadSegments.title,
  description: roadSegments.description,
  geojson: sql<string>`ST_AsGeoJSON(${roadSegments.path})`,
} as const;

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Partial<{
    title: string;
    description: string | null;
    path: LineString;
  }> = {};

  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return Response.json({ error: "Title cannot be empty." }, { status: 400 });
    }
    patch.title = title;
  }
  if ("description" in body) patch.description = cleanText(body.description);
  if ("geometry" in body && body.geometry !== undefined) {
    const geometry = parseLineString(body.geometry);
    if (!geometry) {
      return Response.json(
        { error: "Invalid LineString geometry." },
        { status: 400 },
      );
    }
    patch.path = geometry;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update." }, { status: 400 });
  }

  const [row] = await db
    .update(roadSegments)
    .set(patch)
    .where(eq(roadSegments.id, id))
    .returning(returning);

  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({
    feature: roadSegmentFeatureFromRow(row, await roadSegmentImageList(id)),
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  // Remove image files first; the DB rows go with the segment via ON DELETE CASCADE.
  const images = await db
    .select({ storagePath: roadSegmentImages.storagePath })
    .from(roadSegmentImages)
    .where(eq(roadSegmentImages.roadSegmentId, id));
  await Promise.all(images.map((img) => deleteImage(img.storagePath)));

  const [row] = await db
    .delete(roadSegments)
    .where(eq(roadSegments.id, id))
    .returning({ id: roadSegments.id });

  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
