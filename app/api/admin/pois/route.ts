import { sql } from "drizzle-orm";

import { db } from "@/db";
import { pois } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { parsePoint } from "@/lib/geo";
import { poiFeatureFromRow } from "@/lib/geojson";

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

  const geometry = parsePoint(body.geometry);
  if (!geometry) {
    return Response.json(
      { error: "A valid Point geometry is required." },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(pois)
    .values({
      title,
      description: cleanText(body.description),
      category: cleanText(body.category),
      location: geometry,
    })
    .returning({
      id: pois.id,
      title: pois.title,
      description: pois.description,
      category: pois.category,
      geojson: sql<string>`ST_AsGeoJSON(${pois.location})`,
    });

  return Response.json({ feature: poiFeatureFromRow(row) }, { status: 201 });
}
