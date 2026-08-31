import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { poiImages, roadSegmentImages } from "@/db/schema";
import { toImageRef, type ImageRef } from "@/lib/geojson";

/** Ordered image list for a single POI. */
export async function poiImageList(poiId: string): Promise<ImageRef[]> {
  const rows = await db
    .select()
    .from(poiImages)
    .where(eq(poiImages.poiId, poiId))
    .orderBy(asc(poiImages.sortOrder), asc(poiImages.id));
  return rows.map(toImageRef);
}

/** Ordered image list for a single road segment. */
export async function roadSegmentImageList(
  roadSegmentId: string,
): Promise<ImageRef[]> {
  const rows = await db
    .select()
    .from(roadSegmentImages)
    .where(eq(roadSegmentImages.roadSegmentId, roadSegmentId))
    .orderBy(asc(roadSegmentImages.sortOrder), asc(roadSegmentImages.id));
  return rows.map(toImageRef);
}

/** Images for many POIs at once, grouped by owner id (each list ordered). */
export async function poiImagesByOwner(
  poiIds: string[],
): Promise<Map<string, ImageRef[]>> {
  const grouped = new Map<string, ImageRef[]>();
  if (poiIds.length === 0) return grouped;

  const rows = await db
    .select()
    .from(poiImages)
    .where(inArray(poiImages.poiId, poiIds))
    .orderBy(asc(poiImages.sortOrder), asc(poiImages.id));

  for (const row of rows) {
    const list = grouped.get(row.poiId) ?? [];
    list.push(toImageRef(row));
    grouped.set(row.poiId, list);
  }
  return grouped;
}

/** Images for many road segments at once, grouped by owner id. */
export async function roadSegmentImagesByOwner(
  roadSegmentIds: string[],
): Promise<Map<string, ImageRef[]>> {
  const grouped = new Map<string, ImageRef[]>();
  if (roadSegmentIds.length === 0) return grouped;

  const rows = await db
    .select()
    .from(roadSegmentImages)
    .where(inArray(roadSegmentImages.roadSegmentId, roadSegmentIds))
    .orderBy(asc(roadSegmentImages.sortOrder), asc(roadSegmentImages.id));

  for (const row of rows) {
    const list = grouped.get(row.roadSegmentId) ?? [];
    list.push(toImageRef(row));
    grouped.set(row.roadSegmentId, list);
  }
  return grouped;
}
