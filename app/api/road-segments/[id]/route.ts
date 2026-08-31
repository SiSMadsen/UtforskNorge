import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { roadSegments } from "@/db/schema";
import { isUuid } from "@/lib/geo";
import { roadSegmentFeatureFromRow } from "@/lib/geojson";
import { roadSegmentImageList } from "@/lib/images";
import { roadSegmentJournalList } from "@/lib/journal";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Public detail for one road segment. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const [row] = await db
    .select({
      id: roadSegments.id,
      title: roadSegments.title,
      description: roadSegments.description,
      geojson: sql<string>`ST_AsGeoJSON(${roadSegments.path})`,
    })
    .from(roadSegments)
    .where(eq(roadSegments.id, id));

  if (!row) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const [images, journalEntries] = await Promise.all([
    roadSegmentImageList(id),
    roadSegmentJournalList(id),
  ]);

  return Response.json(
    roadSegmentFeatureFromRow(row, { images, journalEntries }),
  );
}
