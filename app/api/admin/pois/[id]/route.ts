import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { poiImages, pois } from "@/db/schema";
import type { Point } from "@/db/postgis";
import { requireAdmin } from "@/lib/auth";
import { isUuid, parsePoint } from "@/lib/geo";
import { poiFeatureFromRow } from "@/lib/geojson";
import { poiImageList } from "@/lib/images";
import { poiJournalList } from "@/lib/journal";
import { deleteImage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const returning = {
  id: pois.id,
  title: pois.title,
  description: pois.description,
  category: pois.category,
  geojson: sql<string>`ST_AsGeoJSON(${pois.location})`,
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
    category: string | null;
    location: Point;
  }> = {};

  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return Response.json({ error: "Title cannot be empty." }, { status: 400 });
    }
    patch.title = title;
  }
  if ("description" in body) patch.description = cleanText(body.description);
  if ("category" in body) patch.category = cleanText(body.category);
  if ("geometry" in body && body.geometry !== undefined) {
    const geometry = parsePoint(body.geometry);
    if (!geometry) {
      return Response.json({ error: "Invalid Point geometry." }, { status: 400 });
    }
    patch.location = geometry;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update." }, { status: 400 });
  }

  const [row] = await db
    .update(pois)
    .set(patch)
    .where(eq(pois.id, id))
    .returning(returning);

  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  const [images, journalEntries] = await Promise.all([
    poiImageList(id),
    poiJournalList(id),
  ]);
  return Response.json({
    feature: poiFeatureFromRow(row, { images, journalEntries }),
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  // Remove image files first; the DB rows go with the POI via ON DELETE CASCADE.
  const images = await db
    .select({ storagePath: poiImages.storagePath })
    .from(poiImages)
    .where(eq(poiImages.poiId, id));
  await Promise.all(images.map((img) => deleteImage(img.storagePath)));

  const [row] = await db
    .delete(pois)
    .where(eq(pois.id, id))
    .returning({ id: pois.id });

  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
