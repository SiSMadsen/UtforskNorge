"use client";

import { useState } from "react";

import type { JournalEntry } from "@/lib/geojson";

function byDateDesc(a: JournalEntry, b: JournalEntry): number {
  if (a.entryDate !== b.entryDate) return a.entryDate < b.entryDate ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export function JournalManager({
  kind,
  ownerId,
  entries,
  onChange,
}: {
  kind: "poi" | "road";
  ownerId: string;
  entries: JournalEntry[];
  onChange: (entries: JournalEntry[]) => void;
}) {
  // Parent remounts via `key` on feature change, so seeding from props is safe.
  const [list, setList] = useState<JournalEntry[]>(entries);
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase =
    kind === "poi"
      ? `/api/admin/pois/${ownerId}/journal-entries`
      : `/api/admin/road-segments/${ownerId}/journal-entries`;

  function apply(next: JournalEntry[]) {
    setList(next);
    onChange(next);
  }

  async function readError(res: Response, fallback: string): Promise<string> {
    const b = (await res.json().catch(() => null)) as { error?: string } | null;
    return b?.error ?? fallback;
  }

  async function addEntry() {
    if (!body.trim()) {
      setError("Entry text is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryDate, body: body.trim() }),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to add entry."));
      const { entry } = (await res.json()) as { entry: JournalEntry };
      apply([...list, entry].sort(byDateDesc));
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add entry.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(entryId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/${entryId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error(await readError(res, "Delete failed."));
      }
      apply(list.filter((e) => e.id !== entryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Journal ({list.length})
      </span>

      <div className="space-y-1.5">
        <input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="What happened on this visit…"
          className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
        />
        <button
          type="button"
          onClick={addEntry}
          disabled={busy}
          className="rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/[.04] disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/[.06]"
        >
          {busy ? "Working…" : "Add entry"}
        </button>
      </div>

      {list.length > 0 ? (
        <ul className="space-y-1.5">
          {list.map((entry) => (
            <li
              key={entry.id}
              className="rounded border border-black/10 p-2 text-xs dark:border-white/15"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{entry.entryDate}</span>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  disabled={busy}
                  className="text-red-600 hover:text-red-700 disabled:opacity-40 dark:text-red-400"
                >
                  Delete
                </button>
              </div>
              <p className="mt-0.5 whitespace-pre-line text-zinc-600 dark:text-zinc-300">
                {entry.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-500">No entries yet.</p>
      )}

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
