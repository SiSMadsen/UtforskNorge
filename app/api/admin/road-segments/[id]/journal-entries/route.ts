import { eq } from "drizzle-orm";

import { db } from "@/db";
import { roadSegmentJournalEntries, roadSegments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/geo";
import { toJournalEntry } from "@/lib/geojson";
import { isValidEntryDate } from "@/lib/journal";

type Params = { params: Promise<{ id: string }> };

/** Add a journal entry to a road segment. Body: `{ entryDate, body }`. */
export async function POST(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const [owner] = await db
    .select({ id: roadSegments.id })
    .from(roadSegments)
    .where(eq(roadSegments.id, id));
  if (!owner) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidEntryDate(payload.entryDate)) {
    return Response.json(
      { error: "entryDate must be a valid YYYY-MM-DD date." },
      { status: 400 },
    );
  }
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) {
    return Response.json({ error: "body is required." }, { status: 400 });
  }

  const [row] = await db
    .insert(roadSegmentJournalEntries)
    .values({ roadSegmentId: id, entryDate: payload.entryDate, body })
    .returning();

  return Response.json({ entry: toJournalEntry(row) }, { status: 201 });
}
