import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { poiJournalEntries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/geo";
import { toJournalEntry } from "@/lib/geojson";
import { isValidEntryDate } from "@/lib/journal";

type Params = { params: Promise<{ id: string; entryId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id, entryId } = await params;
  if (!isUuid(id) || !isUuid(entryId)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Partial<{ entryDate: string; body: string }> = {};
  if ("entryDate" in payload) {
    if (!isValidEntryDate(payload.entryDate)) {
      return Response.json(
        { error: "entryDate must be a valid YYYY-MM-DD date." },
        { status: 400 },
      );
    }
    patch.entryDate = payload.entryDate;
  }
  if ("body" in payload) {
    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    if (!body) {
      return Response.json({ error: "body cannot be empty." }, { status: 400 });
    }
    patch.body = body;
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update." }, { status: 400 });
  }

  const [row] = await db
    .update(poiJournalEntries)
    .set(patch)
    .where(
      and(
        eq(poiJournalEntries.id, entryId),
        eq(poiJournalEntries.poiId, id),
      ),
    )
    .returning();

  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ entry: toJournalEntry(row) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id, entryId } = await params;
  if (!isUuid(id) || !isUuid(entryId)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const [row] = await db
    .delete(poiJournalEntries)
    .where(
      and(
        eq(poiJournalEntries.id, entryId),
        eq(poiJournalEntries.poiId, id),
      ),
    )
    .returning({ id: poiJournalEntries.id });

  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
