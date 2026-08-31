"use client";

import { useRef, useState } from "react";

import type { ImageRef } from "@/lib/geojson";

export function ImageManager({
  kind,
  ownerId,
  images,
  onChange,
}: {
  kind: "poi" | "road";
  ownerId: string;
  images: ImageRef[];
  onChange: (images: ImageRef[]) => void;
}) {
  // Parent remounts this via `key` when the edited feature changes, so seeding
  // list state straight from props is safe.
  const [list, setList] = useState<ImageRef[]>(images);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragFrom = useRef<number | null>(null);

  const apiBase =
    kind === "poi"
      ? `/api/admin/pois/${ownerId}/images`
      : `/api/admin/road-segments/${ownerId}/images`;

  function apply(next: ImageRef[]) {
    setList(next);
    onChange(next);
  }

  async function readError(res: Response, fallback: string): Promise<string> {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? fallback;
  }

  async function uploadFiles(files: File[]) {
    setBusy(true);
    setError(null);
    try {
      const added: ImageRef[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(apiBase, { method: "POST", body: fd });
        if (!res.ok) throw new Error(await readError(res, "Upload failed."));
        const { image } = (await res.json()) as { image: ImageRef };
        added.push(image);
      }
      apply([...list, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(imageId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(await readError(res, "Delete failed."));
      }
      apply(list.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function persistOrder(next: ImageRef[]) {
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((img) => img.id) }),
      });
      if (!res.ok) throw new Error(await readError(res, "Could not save order."));
      const { images: saved } = (await res.json()) as { images: ImageRef[] };
      apply(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save order.");
    }
  }

  function handleDrop(to: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null || from === to) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    apply(next);
    void persistOrder(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Images ({list.length})
        </span>
        <label className="cursor-pointer rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/[.04] dark:border-white/20 dark:hover:bg-white/[.06]">
          {busy ? "Working…" : "Add images"}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={busy}
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = "";
              if (files.length) void uploadFiles(files);
            }}
          />
        </label>
      </div>

      {list.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {list.map((img, index) => (
            <li
              key={img.id}
              draggable
              onDragStart={() => {
                dragFrom.current = index;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="group relative aspect-square cursor-move overflow-hidden rounded border border-black/10 dark:border-white/15"
              title="Drag to reorder"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.caption ?? ""}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                disabled={busy}
                aria-label="Delete image"
                className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-xs leading-4 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-40"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-500">No images yet.</p>
      )}

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
