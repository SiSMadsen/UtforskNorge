import { sql } from "drizzle-orm";

import { db } from "@/db";
import { roadSegments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { parseLineString } from "@/lib/geo";
import { roadSegmentFeatureFromRow } from "@/lib/geojson";

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return Response.json({ error: "Title is required." }, { status: 400 });
  }

  const geometry = parseLineString(body.geometry);
  if (!geometry) {
    return Response.json(
      { error: "A valid LineString geometry (2+ points) is required." },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(roadSegments)
    .values({
      title,
      description: cleanText(body.description),
      path: geometry,
    })
    .returning({
      id: roadSegments.id,
      title: roadSegments.title,
      description: roadSegments.description,
      geojson: sql<string>`ST_AsGeoJSON(${roadSegments.path})`,
    });

  return Response.json(
    { feature: roadSegmentFeatureFromRow(row) },
    { status: 201 },
  );
}
