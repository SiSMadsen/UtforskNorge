import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { pois } from "@/db/schema";
import { isUuid } from "@/lib/geo";
import { poiFeatureFromRow } from "@/lib/geojson";
import { poiImageList } from "@/lib/images";
import { poiJournalList } from "@/lib/journal";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Public detail for one POI: geometry + description + images + journal entries. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const [row] = await db
    .select({
      id: pois.id,
      title: pois.title,
      description: pois.description,
      category: pois.category,
      geojson: sql<string>`ST_AsGeoJSON(${pois.location})`,
    })
    .from(pois)
    .where(eq(pois.id, id));

  if (!row) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const [images, journalEntries] = await Promise.all([
    poiImageList(id),
    poiJournalList(id),
  ]);

  return Response.json(poiFeatureFromRow(row, { images, journalEntries }));
}
