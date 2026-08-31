import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { poiJournalEntries, roadSegmentJournalEntries } from "@/db/schema";
import { toJournalEntry, type JournalEntry } from "@/lib/geojson";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date in `YYYY-MM-DD` form (rejects e.g. 2024-02-30). */
export function isValidEntryDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

// Newest visit first; created_at breaks ties within the same day.
const poiOrder = [
  desc(poiJournalEntries.entryDate),
  desc(poiJournalEntries.createdAt),
] as const;
const roadOrder = [
  desc(roadSegmentJournalEntries.entryDate),
  desc(roadSegmentJournalEntries.createdAt),
] as const;

export async function poiJournalList(poiId: string): Promise<JournalEntry[]> {
  const rows = await db
    .select()
    .from(poiJournalEntries)
    .where(eq(poiJournalEntries.poiId, poiId))
    .orderBy(...poiOrder);
  return rows.map(toJournalEntry);
}

export async function roadSegmentJournalList(
  roadSegmentId: string,
): Promise<JournalEntry[]> {
  const rows = await db
    .select()
    .from(roadSegmentJournalEntries)
    .where(eq(roadSegmentJournalEntries.roadSegmentId, roadSegmentId))
    .orderBy(...roadOrder);
  return rows.map(toJournalEntry);
}

export async function poiJournalByOwner(
  poiIds: string[],
): Promise<Map<string, JournalEntry[]>> {
  const grouped = new Map<string, JournalEntry[]>();
  if (poiIds.length === 0) return grouped;

  const rows = await db
    .select()
    .from(poiJournalEntries)
    .where(inArray(poiJournalEntries.poiId, poiIds))
    .orderBy(...poiOrder);

  for (const row of rows) {
    const list = grouped.get(row.poiId) ?? [];
    list.push(toJournalEntry(row));
    grouped.set(row.poiId, list);
  }
  return grouped;
}

export async function roadSegmentJournalByOwner(
  roadSegmentIds: string[],
): Promise<Map<string, JournalEntry[]>> {
  const grouped = new Map<string, JournalEntry[]>();
  if (roadSegmentIds.length === 0) return grouped;

  const rows = await db
    .select()
    .from(roadSegmentJournalEntries)
    .where(inArray(roadSegmentJournalEntries.roadSegmentId, roadSegmentIds))
    .orderBy(...roadOrder);

  for (const row of rows) {
    const list = grouped.get(row.roadSegmentId) ?? [];
    list.push(toJournalEntry(row));
    grouped.set(row.roadSegmentId, list);
  }
  return grouped;
}
